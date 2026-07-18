import { Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service";
import { AuthedRequest } from "./auth";
import { UserRole } from "../models/User";

/**
 * Like authenticate(), but never rejects the request — public routes (course catalog,
 * course detail) use this so logged-out visitors still get a response, while logged-in
 * visitors get req.user populated for entitlement checks.
 */
export function optionalAuthenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: payload.sub, role: payload.role as UserRole };
  } catch {
    // Invalid/expired token on a public route — proceed as an anonymous visitor.
  }
  next();
}
