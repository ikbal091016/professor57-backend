import { Router } from "express";
import { listOrders, refundOrderById } from "../controllers/adminOrder.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const adminOnly = authorize("admin");

router.get("/", authenticate, adminOnly, listOrders);
router.post("/:id/refund", authenticate, adminOnly, refundOrderById);

export default router;
