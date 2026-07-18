import { Response } from "express";
import { Entitlement } from "../models/Entitlement";
import { catchAsync } from "../utils/catchAsync";
import { AuthedRequest } from "../middleware/auth";

export const myEntitlements = catchAsync(async (req: AuthedRequest, res: Response) => {
  const entitlements = await Entitlement.find({ userId: req.user!.id })
    .populate("courseId", "title slug thumbnailUrl category")
    .sort({ purchasedAt: -1 })
    .lean();

  res.json({
    courses: entitlements
      .filter((e) => e.courseId) // guard against a since-deleted course
      .map((e) => ({
        course: e.courseId,
        purchasedAt: e.purchasedAt,
      })),
  });
});
