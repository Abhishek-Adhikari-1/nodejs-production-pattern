import { User } from "@prisma/client";
import prisma from "../config/prisma";
import { TokenPair } from "../types/auth";
import { generateTokenPair } from "../utils/tokens";

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

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { is_revoked: true },
  });
}
