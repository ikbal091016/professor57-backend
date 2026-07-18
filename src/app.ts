import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import courseRoutes from "./routes/course.routes";
import sectionRoutes from "./routes/section.routes";
import lectureRoutes from "./routes/lecture.routes";
import checkoutRoutes from "./routes/checkout.routes";
import webhookRoutes from "./routes/webhook.routes";
import muxWebhookRoutes from "./routes/muxWebhook.routes";
import entitlementRoutes from "./routes/entitlement.routes";
import adminOrderRoutes from "./routes/adminOrder.routes";
import adminVideoRoutes from "./routes/adminVideo.routes";
import adminCourseRoutes from "./routes/adminCourse.routes";
import adminUserRoutes from "./routes/adminUser.routes";
import adminAnalyticsRoutes from "./routes/adminAnalytics.routes";
import examRoutes from "./routes/exam.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));

  // Mounted BEFORE express.json(): Stripe/Mux signature verification needs the exact
  // raw request bytes, and express.json() would otherwise consume and reserialize the body.
  app.use("/api/webhooks", webhookRoutes);
  app.use("/api/webhooks", muxWebhookRoutes);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? "combined" : "dev"));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/sections", sectionRoutes);
  app.use("/api/lectures", lectureRoutes);
  app.use("/api/checkout", checkoutRoutes);
  app.use("/api/entitlements", entitlementRoutes);
  app.use("/api/admin/orders", adminOrderRoutes);
  app.use("/api/admin/video", adminVideoRoutes);
  app.use("/api/admin/courses", adminCourseRoutes);
  app.use("/api/admin/users", adminUserRoutes);
  app.use("/api/admin/analytics", adminAnalyticsRoutes);
  app.use("/api/exams", examRoutes);
  // Phase 6 is the last mount point in the original roadmap.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
