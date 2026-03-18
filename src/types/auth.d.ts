import { Request } from "express";
import { User, Session } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";

export interface JWTAccessPayload extends JwtPayload {
  sub: string;            // User ID
  sessionId: string;      // Current session ID
  role: string;           // User role (e.g., 'user', 'admin')
  type: "access";         // Token type indicator
  jti: string;            // Random ID
}

export interface JWTRefreshPayload extends JwtPayload {
  sub: string;            // User ID
  sessionId: string;      // Current session ID
  type: "refresh";        // Token type indicator
}

export interface TokenPair {
  accessToken: string;    // The short-lived access token
  refreshToken: string;   // The long-lived refresh token
  expiresAt: Date;        // The expiration date of the refresh token
}

/**
 * An Express Request that has been authenticated, guaranteeing
 * the presence of `user` and `session` properties from the database.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
  session: Session;
}
