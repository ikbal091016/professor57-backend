import { Router, raw } from "express";
import { handleStripeWebhook } from "../controllers/webhook.controller";

const router = Router();

// raw() preserves the exact request bytes Stripe signed — must not pass through express.json() first.
router.post("/stripe", raw({ type: "application/json" }), handleStripeWebhook);

export default router;
