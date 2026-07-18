import { z } from "zod";

const choiceSchema = z.object({
  id: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(1000),
});

export const createQuestionSchema = z.object({
  body: z
    .object({
      exam: z.string().trim().min(1).max(40),
      section: z.string().trim().min(1).max(60),
      difficulty: z.enum(["easy", "medium", "hard"]),
      type: z.enum(["single", "multi"]).default("single"),
      stem: z.string().trim().min(5).max(4000),
      choices: z.array(choiceSchema).min(2).max(8),
      correctChoiceIds: z.array(z.string()).min(1),
      explanation: z.string().trim().min(5).max(4000),
      tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    })
    .refine((q) => q.correctChoiceIds.every((id) => q.choices.some((c) => c.id === id)), {
      message: "Every correctChoiceId must match one of the provided choice ids.",
      path: ["correctChoiceIds"],
    }),
});

export const updateQuestionSchema = z.object({
  body: createQuestionSchema.shape.body.innerType().partial(),
});

export const bulkImportQuestionsSchema = z.object({
  body: z.object({
    questions: z.array(createQuestionSchema.shape.body).min(1).max(500),
  }),
});

export const listQuestionsQuerySchema = z.object({
  query: z.object({
    exam: z.string().optional(),
    section: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const createTestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    exam: z.string().trim().min(1).max(40),
    type: z.enum(["practice", "timed_section", "mock"]),
    section: z.string().trim().max(60).optional(),
    questionIds: z.array(z.string()).min(1).max(300),
    timeLimitSec: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    productCourseId: z.string().optional(),
    published: z.boolean().optional(),
  }),
});

export const updateTestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160).optional(),
    type: z.enum(["practice", "timed_section", "mock"]).optional(),
    section: z.string().trim().max(60).optional(),
    questionIds: z.array(z.string()).min(1).max(300).optional(),
    timeLimitSec: z.number().int().min(0).optional(),
    isFree: z.boolean().optional(),
    productCourseId: z.string().optional(),
    published: z.boolean().optional(),
  }),
});

export const saveAnswerSchema = z.object({
  body: z.object({
    questionId: z.string(),
    selectedChoiceIds: z.array(z.string()).default([]),
    flagged: z.boolean().optional(),
    timeSpentSec: z.number().min(0).optional(),
  }),
});
