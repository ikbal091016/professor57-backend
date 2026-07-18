import { Router } from "express";
import { listCoursesForManagement } from "../controllers/adminCourse.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.get("/", authenticate, authorize("admin", "instructor"), listCoursesForManagement);

export default router;
