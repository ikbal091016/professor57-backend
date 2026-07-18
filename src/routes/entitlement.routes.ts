import { Router } from "express";
import { myEntitlements } from "../controllers/entitlement.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/me", authenticate, myEntitlements);

export default router;
