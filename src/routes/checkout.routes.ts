import { Router } from "express";
import { createCheckoutSession } from "../controllers/checkout.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { createCheckoutSchema } from "../validators/checkout.validator";

const router = Router();

router.post("/session", authenticate, validate(createCheckoutSchema), createCheckoutSession);

export default router;
