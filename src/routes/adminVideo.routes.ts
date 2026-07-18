import { Router } from "express";
import { createUploadForLecture } from "../controllers/adminVideo.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const staff = authorize("admin", "instructor");

router.post("/lectures/:lectureId/uploads", authenticate, staff, createUploadForLecture);

export default router;
