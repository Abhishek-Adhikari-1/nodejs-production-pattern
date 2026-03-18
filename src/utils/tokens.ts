import jwt from "jsonwebtoken";
import { randomBytes, randomUUID } from "crypto";
import { envConfig } from "../config/env-config";
import { JWTAccessPayload, JWTRefreshPayload, TokenPair } from "../types/auth";

/**
 * Parses duration strings like "15m", "7d" into milliseconds.
 *
 * @param duration The duration string (e.g., "15m", "7d")
 * @returns The duration in milliseconds
 */
export function parseDuration(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1));
  const map: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (map[unit] ?? 1000);
}

/**
 * Generates an Access Token for a user session.
 *
 * @param userId The ID of the user
 * @param sessionId The ID of the current session
 * @param email The email address of the user
 * @param role The role of the user (e.g., "admin", "user")
 * @returns The signed JWT Access Token string
 */
export function generateAccessToken(
  userId: string,
  sessionId: string,
  role: string,
): string {
  const payload: JWTAccessPayload = {
    sub: userId,
    sessionId,
    role,
    type: "access",
    jti: randomUUID(),
  };

  return jwt.sign(payload, envConfig.JWT_ACCESS_SECRET, {
    expiresIn: envConfig.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/**
 * Generates a Refresh Token for a user session.
 *
 * @param userId The ID of the user
 * @param sessionId The ID of the current session
 * @returns The signed JWT Refresh Token string
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
): string {
  const payload: JWTRefreshPayload = {
    sub: userId,
    sessionId,
    type: "refresh",
  };

  return jwt.sign(payload, envConfig.JWT_REFRESH_SECRET, {
    expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/**
 * Verifies and parses an Access Token.
 *
 * @param token The JWT access token string
 * @returns The decoded token payload
 * @throws JsonWebTokenError if token is invalid or expired
 */
export function verifyAccessToken(token: string): JWTAccessPayload {
  return jwt.verify(token, envConfig.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as JWTAccessPayload;
}

/**
 * Verifies and parses a Refresh Token.
 *
 * @param token The JWT refresh token string
 * @returns The decoded token payload
 * @throws JsonWebTokenError if token is invalid or expired
 */
export function verifyRefreshToken(token: string): JWTRefreshPayload {
  return jwt.verify(token, envConfig.JWT_REFRESH_SECRET, {
    algorithms: ["HS256"],
  }) as JWTRefreshPayload;
}

/**
 * Generates both an Access Token and a Refresh Token, plus the expiration date.
 *
 * @param userId The ID of the user
 * @param sessionId The ID of the current session
 * @param email The email address of the user
 * @param role The role of the user
 * @returns An object containing the generated token pair and its expiration date
 */
export function generateTokenPair(
  userId: string,
  sessionId: string,
  role: string,
): TokenPair {
  const accessToken = generateAccessToken(userId, sessionId, role);
  const refreshToken = generateRefreshToken(userId, sessionId);
  const expiresAt = new Date(
    Date.now() + parseDuration(envConfig.JWT_REFRESH_EXPIRES_IN),
  );

  return { accessToken, refreshToken, expiresAt };
}

/**
 * Generates a secure random hex token (e.g., for email verification or password reset).
 *
 * @param bytes The number of random bytes to generate (default: 32)
 * @returns A randomly generated hex string
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Calculates an expiration Date object.
 *
 * @param hours The number of hours until expiration (default: 24)
 * @returns A Date object representing the expiration time
 */
export function getVerificationExpiry(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: envConfig.NODE_ENVIRONMENT === "production",
  sameSite: "lax" as const,
  path: "/",
};
