import { Router } from "express";
import * as courseController from "../controllers/course.controller";
import { getLecturePlayback } from "../controllers/lecturePlayback.controller";
import { validate } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { optionalAuthenticate } from "../middleware/optionalAuth";
import { updateLectureSchema } from "../validators/course.validator";

// Mounted at /api/lectures for direct addressing by lecture ID.
const router = Router();
const staff = authorize("admin", "instructor");

router.get("/:id/playback", optionalAuthenticate, getLecturePlayback);

router.patch("/:id", authenticate, staff, validate(updateLectureSchema), courseController.updateLecture);
router.delete("/:id", authenticate, staff, courseController.deleteLecture);

export default router;
