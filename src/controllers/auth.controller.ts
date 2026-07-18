import { Request, Response } from "express";
import { User } from "../models/User";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateEmailToken,
  hashToken,
} from "../services/token.service";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../services/email.service";
import { env } from "../config/env";
import { AuthedRequest } from "../middleware/auth";

const REFRESH_COOKIE = "p57_refresh";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    domain: env.isProd ? env.cookieDomain : undefined,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days, mirrors JWT_REFRESH_EXPIRES_IN
  });
}

function publicUser(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  };
}

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  const user = await User.create({ name, email, passwordHash: password });

  const { raw, hash } = generateEmailToken();
  user.emailVerifyTokenHash = hash;
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendVerificationEmail(user.email, user.name, raw);

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);

  res.status(201).json({ user: publicUser(user), accessToken });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Incorrect email or password.", 401, "INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);

  res.json({ user: publicUser(user), accessToken });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError("Not authenticated.", 401, "NO_REFRESH_TOKEN");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError("Session expired. Please log in again.", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    throw new AppError("Session expired. Please log in again.", 401, "TOKEN_REVOKED");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  setRefreshCookie(res, refreshToken);

  res.json({ user: publicUser(user), accessToken });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
});

/** Invalidates every outstanding refresh token for the user (e.g. "log out of all devices"). */
export const logoutAllDevices = catchAsync(async (req: AuthedRequest, res: Response) => {
  await User.findByIdAndUpdate(req.user!.id, { $inc: { tokenVersion: 1 } });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body;
  const hash = hashToken(token);

  const user = await User.findOne({
    emailVerifyTokenHash: hash,
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyTokenHash +emailVerifyExpires");

  if (!user) throw new AppError("This verification link is invalid or has expired.", 400, "INVALID_VERIFY_TOKEN");

  user.isEmailVerified = true;
  user.emailVerifyTokenHash = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();

  await sendWelcomeEmail(user.email, user.name);

  res.json({ message: "Email verified." });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond the same way, whether or not the account exists — avoids leaking which emails are registered.
  if (user) {
    const { raw, hash } = generateEmailToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(user.email, user.name, raw);
  }

  res.json({ message: "If that email is registered, a reset link has been sent." });
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const hash = hashToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user) throw new AppError("This reset link is invalid or has expired.", 400, "INVALID_RESET_TOKEN");

  user.passwordHash = password; // re-hashed by the pre-save hook
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion += 1; // invalidates any existing refresh tokens
  await user.save();

  res.json({ message: "Password updated. Please log in with your new password." });
});

export const me = catchAsync(async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  res.json({ user: publicUser(user) });
});
