import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { IUser } from "../models/User";

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(user: IUser): string {
  const payload: AccessTokenPayload = { sub: user._id.toString(), role: user.role };
  const options: jwt.SignOptions = { expiresIn: env.jwtAccessExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function signRefreshToken(user: IUser): string {
  const payload: RefreshTokenPayload = {
    sub: user._id.toString(),
    tokenVersion: user.tokenVersion,
  };
  const options: jwt.SignOptions = { expiresIn: env.jwtRefreshExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}

/** Generates a raw token to email to the user, and the hash to store in the DB. Never store the raw token. */
export function generateEmailToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
