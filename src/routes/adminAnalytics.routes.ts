import { Router } from "express";
import { getAnalyticsSummary } from "../controllers/adminAnalytics.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.get("/summary", authenticate, authorize("admin"), getAnalyticsSummary);

export default router;
