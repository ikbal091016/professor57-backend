import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { optionalAuthenticate } from "../middleware/optionalAuth";
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
  createSectionSchema,
  updateSectionSchema,
  createLectureSchema,
  updateLectureSchema,
  reorderSchema,
} from "../validators/course.validator";

const router = Router();
const staff = authorize("admin", "instructor");

// ---- public ----
router.get("/", validate(listCoursesQuerySchema), courseController.listCourses);
router.get("/:slug", optionalAuthenticate, courseController.getCourseBySlug);

// ---- course CRUD (admin / owning instructor) ----
router.post("/", authenticate, staff, validate(createCourseSchema), courseController.createCourse);
router.get("/:id/edit", authenticate, staff, courseController.getCourseForEditing);
router.patch("/:id", authenticate, staff, validate(updateCourseSchema), courseController.updateCourse);
router.delete("/:id", authenticate, staff, courseController.deleteCourse);

// ---- sections ----
router.post(
  "/:courseId/sections",
  authenticate,
  staff,
  validate(createSectionSchema),
  courseController.createSection
);
router.post(
  "/:courseId/sections/reorder",
  authenticate,
  staff,
  validate(reorderSchema),
  courseController.reorderSections
);

// ---- lectures ----
router.post(
  "/sections/:sectionId/lectures",
  authenticate,
  staff,
  validate(createLectureSchema),
  courseController.createLecture
);
router.post(
  "/sections/:sectionId/lectures/reorder",
  authenticate,
  staff,
  validate(reorderSchema),
  courseController.reorderLectures
);

export default router;
