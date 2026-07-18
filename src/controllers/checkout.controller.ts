import { Response } from "express";
import { User } from "../models/User";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { startCheckout } from "../services/payments.service";
import { AuthedRequest } from "../middleware/auth";

export const createCheckoutSession = catchAsync(async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  const { courseIds, promotionCode } = req.body as { courseIds: string[]; promotionCode?: string };
  const result = await startCheckout({ userId: user._id.toString(), userEmail: user.email, courseIds, promotionCode });

  res.json(result);
});
