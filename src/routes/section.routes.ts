import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { updateSectionSchema } from "../validators/course.validator";

// Mounted separately at /api/sections since a section is addressed by its own ID here,
// not nested under a course path.
const router = Router();
const staff = authorize("admin", "instructor");

router.patch("/:id", authenticate, staff, validate(updateSectionSchema), courseController.updateSection);
router.delete("/:id", authenticate, staff, courseController.deleteSection);

export default router;
