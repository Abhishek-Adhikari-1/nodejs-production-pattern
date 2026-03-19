import { Prisma, User } from "@prisma/client";
import prisma from "../config/prisma";
import { TokenPair } from "../types/auth";
import { generateTokenPair, parseDuration } from "../utils/tokens";
import { AppError } from "../utils/app-error";
import { envConfig } from "../config/env-config";
import { randomUUID } from "crypto";

/**
 * Creates a new session for a user.
 *
 * @param user The user to create a session for
 * @param ip `optional` The IP address of the user
 * @param ua `optional` The user agent of the user
 * @returns The created session and its associated tokens
 */
export async function createSession(
  user: User,
  ip?: string,
  ua?: string,
): Promise<TokenPair & { sessionId: string }> {
  const sessionId = randomUUID();
  const tokens = generateTokenPair(user.id, sessionId, user.role);

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      user_id: user.id,
      token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      ip_address: ip,
      user_agent: ua,
    },
  });

  return { ...tokens, sessionId: session.id };
}

/**
 * Updates a session for a user.
 *
 * @param sessionId The ID of the session to update
 * @param ip `optional` The IP address of the user
 * @param ua `optional` The user agent of the user
 * @returns The updated session and its associated tokens
 */
export async function updateSession(
  sessionId: string,
  ip?: string,
  ua?: string,
) {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Read session inside transaction
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (!session || session.is_revoked || session.expires_at < new Date()) {
        throw new AppError("Invalid or expired refresh token.", 401);
      }

      const tokens = generateTokenPair(
        session.user.id,
        session.id,
        session.user.role,
      );

      // 2. Update session with new tokens atomically
      await tx.session.update({
        where: { id: session.id },
        data: {
          token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt,
          ip_address: ip,
          user_agent: ua,
        },
      });

      return { ...tokens, sessionId: session.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Revokes a session by deleting it.
 *
 * @param sessionId The ID of the session to revoke
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { id: sessionId },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      // Session already deleted → treat as success
      return;
    }
    throw err;
  }
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
