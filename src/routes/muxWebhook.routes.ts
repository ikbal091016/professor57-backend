import { Router, raw } from "express";
import { handleMuxWebhook } from "../controllers/muxWebhook.controller";

const router = Router();

router.post("/mux", raw({ type: "application/json" }), handleMuxWebhook);

export default router;
