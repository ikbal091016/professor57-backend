import { Response } from "express";
import { Types } from "mongoose";
import { Test, ITest } from "../models/Test";
import { Question, IQuestion } from "../models/Question";
import { TestAttempt, IAttemptAnswer } from "../models/TestAttempt";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { canAccessTest, sanitizeQuestion, scoreAttempt } from "../services/exam.service";
import { AuthedRequest } from "../middleware/auth";

/** Loads a test's questions in the test's own defined order (Mongo's $in doesn't preserve it). */
async function loadOrderedQuestions(test: ITest) {
  const questions = await Question.find({ _id: { $in: test.questionIds } });
  const byId = new Map(questions.map((q) => [q._id.toString(), q]));
  return test.questionIds
    .map((id) => byId.get(id.toString()))
    .filter((q) => q !== undefined);
}

type LoadedQuestions = Awaited<ReturnType<typeof loadOrderedQuestions>>;

function attemptView(attempt: InstanceType<typeof TestAttempt>, test: ITest, questions: LoadedQuestions) {
  return {
    attempt: {
      id: attempt._id.toString(),
      status: attempt.status,
      startedAt: attempt.startedAt,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId.toString(),
        selectedChoiceIds: a.selectedChoiceIds,
        flagged: a.flagged,
      })),
    },
    test: {
      id: test._id.toString(),
      title: test.title,
      exam: test.exam,
      type: test.type,
      timeLimitSec: test.timeLimitSec,
    },
    questions: questions.map(sanitizeQuestion),
  };
}

async function requireOwnAttempt(req: AuthedRequest) {
  const attempt = await TestAttempt.findById(req.params.id);
  if (!attempt) throw new AppError("Attempt not found.", 404, "ATTEMPT_NOT_FOUND");
  if (attempt.userId.toString() !== req.user!.id) {
    throw new AppError("This isn't your test attempt.", 403, "FORBIDDEN");
  }
  return attempt;
}

// ---------- start / resume ----------

export const startAttempt = catchAsync(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findOne({ _id: req.params.testId, published: true });
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");

  const allowed = await canAccessTest(req.user, test);
  if (!allowed) throw new AppError("This test unlocks with purchase.", 403, "LOCKED_TEST");

  // Resume an existing in-progress attempt rather than starting a duplicate —
  // a page refresh mid-test shouldn't reset the clock or lose flagged questions.
  let attempt = await TestAttempt.findOne({ userId: req.user!.id, testId: test._id, status: "in_progress" });
  if (!attempt) {
    attempt = await TestAttempt.create({ userId: req.user!.id, testId: test._id, answers: [] });
  }

  const questions = await loadOrderedQuestions(test);
  res.status(201).json(attemptView(attempt, test, questions));
});

// ---------- resume by id ----------

export const getAttempt = catchAsync(async (req: AuthedRequest, res: Response) => {
  const attempt = await requireOwnAttempt(req);
  const test = await Test.findById(attempt.testId);
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");

  const questions = await loadOrderedQuestions(test);
  res.json(attemptView(attempt, test, questions));
});

// ---------- autosave one answer ----------

export const saveAnswer = catchAsync(async (req: AuthedRequest, res: Response) => {
  const attempt = await requireOwnAttempt(req);
  if (attempt.status !== "in_progress") {
    throw new AppError("This attempt has already been submitted.", 409, "ATTEMPT_SUBMITTED");
  }

  const { questionId, selectedChoiceIds, flagged, timeSpentSec } = req.body as {
    questionId: string;
    selectedChoiceIds: string[];
    flagged?: boolean;
    timeSpentSec?: number;
  };

  const existing = attempt.answers.find((a) => a.questionId.toString() === questionId);
  if (existing) {
    existing.selectedChoiceIds = selectedChoiceIds;
    if (flagged !== undefined) existing.flagged = flagged;
    if (timeSpentSec !== undefined) existing.timeSpentSec += timeSpentSec;
  } else {
    attempt.answers.push({
      questionId: new Types.ObjectId(questionId),
      selectedChoiceIds,
      flagged: flagged ?? false,
      timeSpentSec: timeSpentSec ?? 0,
    } as IAttemptAnswer);
  }
  await attempt.save();

  const test = await Test.findById(attempt.testId).select("type").lean();

  // Practice mode gives immediate per-question feedback; timed/mock modes withhold
  // the answer key until submission, per the architecture doc's Magoosh-style spec.
  if (test?.type === "practice") {
    const question = await Question.findById(questionId).select("correctChoiceIds explanation").lean();
    if (question) {
      const selected = [...selectedChoiceIds].sort();
      const correct = [...question.correctChoiceIds].sort();
      const isCorrect = selected.length === correct.length && selected.every((id, i) => id === correct[i]);
      return res.json({
        saved: true,
        isCorrect,
        correctChoiceIds: question.correctChoiceIds,
        explanation: question.explanation,
      });
    }
  }

  res.json({ saved: true });
});

// ---------- submit ----------

export const submitAttempt = catchAsync(async (req: AuthedRequest, res: Response) => {
  const attempt = await requireOwnAttempt(req);
  if (attempt.status !== "in_progress") {
    throw new AppError("This attempt has already been submitted.", 409, "ATTEMPT_SUBMITTED");
  }

  const test = await Test.findById(attempt.testId);
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");
  const questions = await loadOrderedQuestions(test);

  const score = scoreAttempt(attempt.answers, questions);
  attempt.status = "submitted";
  attempt.submittedAt = new Date();
  attempt.scoreCorrect = score.scoreCorrect;
  attempt.scoreTotal = score.scoreTotal;
  attempt.sectionBreakdown = score.sectionBreakdown;
  attempt.topicAccuracy = score.topicAccuracy;
  await attempt.save();

  res.json(buildResultsResponse(attempt, test, questions));
});

// ---------- results (revisit after submission) ----------

export const getResults = catchAsync(async (req: AuthedRequest, res: Response) => {
  const attempt = await requireOwnAttempt(req);
  if (attempt.status !== "submitted") {
    throw new AppError("This attempt hasn't been submitted yet.", 409, "ATTEMPT_IN_PROGRESS");
  }
  const test = await Test.findById(attempt.testId);
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");
  const questions = await loadOrderedQuestions(test);

  res.json(buildResultsResponse(attempt, test, questions));
});

function buildResultsResponse(attempt: InstanceType<typeof TestAttempt>, test: ITest, questions: LoadedQuestions) {
  const answerByQuestion = new Map(attempt.answers.map((a) => [a.questionId.toString(), a]));
  return {
    testTitle: test.title,
    score: { correct: attempt.scoreCorrect, total: attempt.scoreTotal },
    sectionBreakdown: attempt.sectionBreakdown,
    topicAccuracy: attempt.topicAccuracy,
    questions: questions.map((q) => ({
      ...sanitizeQuestion(q),
      correctChoiceIds: q.correctChoiceIds,
      explanation: q.explanation,
      selectedChoiceIds: answerByQuestion.get(q._id.toString())?.selectedChoiceIds || [],
    })),
  };
}

// ---------- my test history ----------

export const myAttempts = catchAsync(async (req: AuthedRequest, res: Response) => {
  const attempts = await TestAttempt.find({ userId: req.user!.id })
    .populate("testId", "title exam type")
    .sort({ startedAt: -1 })
    .lean();

  res.json({
    attempts: attempts.map((a) => ({
      id: a._id.toString(),
      test: a.testId,
      status: a.status,
      score: a.status === "submitted" ? { correct: a.scoreCorrect, total: a.scoreTotal } : null,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
  });
});
