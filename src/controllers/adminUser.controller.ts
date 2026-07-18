import { Response } from "express";
import { User } from "../models/User";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuthedRequest } from "../middleware/auth";

export const listUsers = catchAsync(async (req: AuthedRequest, res: Response) => {
  const { search, role, page = 1, limit = 25 } = req.query as {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  };

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email role isEmailVerified createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ users, page, limit, total, totalPages: Math.ceil(total / limit) });
});

/** Admins only — changes what a user is allowed to do, so this is the one endpoint that's admin-exclusive, not staff-shared. */
export const updateUserRole = catchAsync(async (req: AuthedRequest, res: Response) => {
  if (req.params.id === req.user!.id) {
    throw new AppError("You can't change your own role.", 400, "CANNOT_CHANGE_OWN_ROLE");
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

  user.role = req.body.role;
  await user.save();
  res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
});
