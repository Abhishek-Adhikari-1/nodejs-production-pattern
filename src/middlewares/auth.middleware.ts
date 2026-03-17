import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";
import { verifyAccessToken } from "../utils/tokens";
import { getActiveSession } from "../services/session.service";
import { assertValidUser } from "../utils/user-guards";
import { AuthenticatedRequest } from "../types/auth";

/**
 * Authentication middleware that verifies the JWT access token,
 * loads the session and user from the database, and attaches them
 * to the request object — producing an `AuthenticatedRequest`.
 *
 * Token is extracted from:
 *  1. `Authorization: Bearer <token>` header
 *  2. `access_token` cookie (fallback)
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req) ?? req.cookies?.access_token;
    
    if (!token) {
      throw new AppError(
        "Authentication required. Please log in.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    const payload = verifyAccessToken(token);

    // Look up the active (non-revoked, non-expired) session with the user
    const session = await getActiveSession(payload.sessionId);
    if (!session) {
      throw new AppError(
        "Session expired or revoked. Please log in again.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Assert the user is in a valid state (approved, email verified, not deleted)
    assertValidUser(session.user);

    req.user = session.user;
    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function assertAuthenticated(
  req: Request,
): asserts req is AuthenticatedRequest {
  if (!req.user || !req.session) {
    throw new AppError(
      "Authentication required. Please log in.",
      HTTP_STATUS.UNAUTHORIZED,
    );
  }
}
