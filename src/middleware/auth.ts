import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../services/token.service";
import { UserRole } from "../models/User";

export interface AuthedRequest extends Request {
  user?: { id: string; role: UserRole };
}

/** Requires a valid access token in the Authorization header. Attaches req.user. */
export function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("You must be logged in to do that.", 401, "NO_TOKEN"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role as UserRole };
    next();
  } catch {
    next(new AppError("Your session has expired. Please log in again.", 401, "INVALID_TOKEN"));
  }
}

/** Restricts a route to one or more roles. Use after authenticate(). */
export function authorize(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You don't have permission to do that.", 403, "FORBIDDEN"));
    }
    next();
  };
}
