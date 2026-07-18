import { Response } from "express";
import { Question } from "../models/Question";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuthedRequest } from "../middleware/auth";

export const listQuestions = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { exam, section, difficulty, page = 1, limit = 25 } = req.query as {
    exam?: string;
    section?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  };

  const filter: Record<string, unknown> = {};
  if (exam) filter.exam = exam;
  if (section) filter.section = section;
  if (difficulty) filter.difficulty = difficulty;

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  res.json({ questions, page, limit, total, totalPages: Math.ceil(total / limit) });
});

export const createQuestion = catchAsync(async (req: AuthedRequest, res: Response) => {
  const question = await Question.create(req.body);
  res.status(201).json({ question });
});

export const bulkImportQuestions = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { questions } = req.body as { questions: unknown[] };
  const created = await Question.insertMany(questions, { ordered: false });
  res.status(201).json({ created: created.length });
});

export const updateQuestion = catchAsync(async (req: AuthedRequest, res: Response) => {
  const question = await Question.findById(req.params.id);
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  Object.assign(question, req.body);
  await question.save();
  res.json({ question });
});

export const deleteQuestion = catchAsync(async (req: AuthedRequest, res: Response) => {
  const question = await Question.findByIdAndDelete(req.params.id);
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  res.status(204).send();
});
