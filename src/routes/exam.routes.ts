import { Router } from "express";
import * as questionController from "../controllers/question.controller";
import * as testController from "../controllers/test.controller";
import * as attemptController from "../controllers/attempt.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { optionalAuthenticate } from "../middleware/optionalAuth";
import {
  createQuestionSchema,
  updateQuestionSchema,
  bulkImportQuestionsSchema,
  listQuestionsQuerySchema,
  createTestSchema,
  updateTestSchema,
  saveAnswerSchema,
} from "../validators/exam.validator";

const router = Router();
const staff = authorize("admin", "instructor");

// ---- public: test catalog ----
router.get("/tests", optionalAuthenticate, testController.listTests);
router.get("/tests/:id", optionalAuthenticate, testController.getTest);

// ---- attempts (authenticated) ----
router.post("/tests/:testId/attempts", authenticate, attemptController.startAttempt);
router.get("/attempts/me", authenticate, attemptController.myAttempts);
router.get("/attempts/:id", authenticate, attemptController.getAttempt);
router.patch("/attempts/:id/answers", authenticate, validate(saveAnswerSchema), attemptController.saveAnswer);
router.post("/attempts/:id/submit", authenticate, attemptController.submitAttempt);
router.get("/attempts/:id/results", authenticate, attemptController.getResults);

// ---- admin: test definitions ----
router.get("/admin/tests", authenticate, staff, testController.listTestsForManagement);
router.post("/tests", authenticate, staff, validate(createTestSchema), testController.createTest);
router.patch("/tests/:id", authenticate, staff, validate(updateTestSchema), testController.updateTest);
router.delete("/tests/:id", authenticate, staff, testController.deleteTest);

// ---- admin: question bank ----
router.get("/questions", authenticate, staff, validate(listQuestionsQuerySchema), questionController.listQuestions);
router.post("/questions", authenticate, staff, validate(createQuestionSchema), questionController.createQuestion);
router.post(
  "/questions/bulk-import",
  authenticate,
  staff,
  validate(bulkImportQuestionsSchema),
  questionController.bulkImportQuestions
);
router.patch(
  "/questions/:id",
  authenticate,
  staff,
  validate(updateQuestionSchema),
  questionController.updateQuestion
);
router.delete("/questions/:id", authenticate, staff, questionController.deleteQuestion);

export default router;
