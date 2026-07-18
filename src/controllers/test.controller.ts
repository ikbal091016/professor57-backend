import { Response } from "express";
import { Test } from "../models/Test";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { canAccessTest } from "../services/exam.service";
import { AuthedRequest } from "../middleware/auth";

// ---------- public ----------

export const listTests = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { exam } = req.query as { exam?: string };
  const filter: Record<string, unknown> = { published: true };
  if (exam) filter.exam = exam;

  const tests = await Test.find(filter).sort({ exam: 1, type: 1, title: 1 }).lean();

  const results = await Promise.all(
    tests.map(async (test) => ({
      id: test._id.toString(),
      title: test.title,
      exam: test.exam,
      type: test.type,
      section: test.section,
      timeLimitSec: test.timeLimitSec,
      questionCount: test.questionIds.length,
      isFree: test.isFree,
      locked: !(await canAccessTest(req.user, test as any)),
    }))
  );

  res.json({ tests: results });
});

export const getTest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findOne({ _id: req.params.id, published: true });
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");

  const locked = !(await canAccessTest(req.user, test));
  res.json({
    test: {
      id: test._id.toString(),
      title: test.title,
      exam: test.exam,
      type: test.type,
      section: test.section,
      timeLimitSec: test.timeLimitSec,
      questionCount: test.questionIds.length,
      isFree: test.isFree,
    },
    locked,
  });
});

// ---------- admin / instructor ----------

export const listTestsForManagement = catchAsync(async (_req: AuthedRequest, res: Response) => {
  const tests = await Test.find().sort({ createdAt: -1 }).lean();
  res.json({
    tests: tests.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      exam: t.exam,
      type: t.type,
      section: t.section,
      questionCount: t.questionIds.length,
      timeLimitSec: t.timeLimitSec,
      isFree: t.isFree,
      productCourseId: t.productCourseId?.toString(),
      published: t.published,
    })),
  });
});

export const createTest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const test = await Test.create(req.body);
  res.status(201).json({ test });
});

export const updateTest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findById(req.params.id);
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");
  Object.assign(test, req.body);
  await test.save();
  res.json({ test });
});

export const deleteTest = catchAsync(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findByIdAndDelete(req.params.id);
  if (!test) throw new AppError("Test not found.", 404, "TEST_NOT_FOUND");
  res.status(204).send();
});
