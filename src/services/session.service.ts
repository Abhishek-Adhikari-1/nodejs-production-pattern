import { Session, User } from "@prisma/client";
import prisma from "../config/prisma";
import { TokenPair } from "../types/auth";
import { generateTokenPair, parseDuration } from "../utils/tokens";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";
import { envConfig } from "../config/env-config";

/**
 * Creates a new session for a user.
 *
 * @param userId The ID of the user
 * @param email The email address of the user
 * @param role The role of the user
 * @param ipAddress The IP address of the user
 * @param userAgent The user agent of the user
 * @returns The created session and its associated tokens
 */
export async function createSession(
  user: User,
  ipAddress?: string,
  userAgent?: string,
): Promise<TokenPair & { sessionId: string }> {
  // Create session placeholder to get an ID
  const session = await prisma.session.create({
    data: {
      user_id: user.id,
      token: "pending",
      refresh_token: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });

  const tokens = generateTokenPair(user.id, session.id, user.role);

  // Update with real tokens
  await prisma.session.update({
    where: { id: session.id },
    data: {
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
    },
  });

  return { ...tokens, sessionId: session.id };
}

/**
 * Updates a session for a user.
 *
 * @param session The session to update
 * @param ipAddress `optional` The IP address of the user
 * @param userAgent `optional` The user agent of the user
 * @returns The updated session and its associated tokens
 */
export async function updateSession(
  session: Session,
  ipAddress?: string,
  userAgent?: string,
): Promise<TokenPair & { sessionId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: session.user_id },
  });

  if (!user) {
    throw new AppError("User not found.", HTTP_STATUS.NOT_FOUND);
  }

  const tokens = generateTokenPair(user.id, session.id, user.role);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });

  return { ...tokens, sessionId: session.id };
}

/**
 * Revokes a session by deleting it.
 *
 * @param sessionId The ID of the session to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.delete({
    where: { id: sessionId },
  });
}

/**
 * Revokes all sessions for a user except the current one.
 *
 * @param userId The ID of the user
 * @param exceptSessionId `optional` The ID of the session to exclude from revocation
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      user_id: userId,
      is_revoked: false,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });
}

/**
 * Retrieves an active session by its ID.
 *
 * @param sessionId The ID of the session to retrieve
 * @returns The active session if found, otherwise null
 */
export async function getActiveSession(sessionId: string) {
  return prisma.session.findUnique({
    where: {
      id: sessionId,
      is_revoked: false,
      expires_at: { gt: new Date() },
    },
    include: { user: true },
  });
}

/**
 * Retrieves all active sessions for a user.
 *
 * @param userId The ID of the user
 * @returns An array of active sessions for the user
 */
export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: {
      user_id: userId,
      is_revoked: false,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      ip_address: true,
      user_agent: true,
      created_at: true,
      expires_at: true,
    },
  });
}

/**
 * Cleans up expired and revoked sessions.
 */
export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        {
          is_revoked: true,
          updated_at: {
            lt: new Date(
              Date.now() - parseDuration(envConfig.JWT_REFRESH_EXPIRES_IN),
            ),
          },
        },
      ],
    },
  });
}
