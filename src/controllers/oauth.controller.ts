import { randomBytes } from "crypto";
import { NextFunction, Request, Response } from "express";
import {
  exchangeGoogleCode,
  getGoogleAuthUrl,
} from "../services/oauth.service";
import { prisma } from "../config/prisma";
import { createSession } from "../services/session.service";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";
import { COOKIE_OPTIONS, parseDuration } from "../utils/tokens";
import { envConfig } from "../config/env-config";
import { OAuthProfile } from "../types/auth";
import { Prisma } from "@prisma/client";

// In-memory state store
const oauthStates = new Map<string, { createdAt: number; redirect?: string }>();
const STATE_TTL = 10 * 60 * 1000; // 10 minutes

function generateState(redirect?: string): string {
  const state = randomBytes(16).toString("hex");
  oauthStates.set(state, { createdAt: Date.now(), redirect });

  // Cleanup old states
  for (const [key, val] of oauthStates) {
    if (Date.now() - val.createdAt > STATE_TTL) oauthStates.delete(key);
  }
  return state;
}

function isValidRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const origin = parsedUrl.origin;
    if (envConfig.ALLOWED_ORIGINS.includes("*")) {
      return true;
    }
    return envConfig.ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

function validateState(state: string): { valid: boolean; redirect?: string } {
  const entry = oauthStates.get(state);
  if (!entry || Date.now() - entry.createdAt > STATE_TTL) {
    return { valid: false };
  }
  oauthStates.delete(state);
  return { valid: true, redirect: entry.redirect };
}

async function findOrCreateOAuthUser(
  profile: OAuthProfile,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Upsert the Google account 
      //    If the account already exists → update tokens.
      //    If not → resolve the user first, then create.
      const existingAccount = await tx.account.findUnique({
        where: {
          provider_provider_account_id: {
            provider: "GOOGLE",
            provider_account_id: profile.id,
          },
        },
        include: { user: true },
      });

      if (existingAccount) {
        // Returning user — just refresh their Google tokens
        await tx.account.update({
          where: { id: existingAccount.id },
          data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_at: expiresAt,
          },
        });
        return existingAccount.user;
      }

      // 2. No Google account yet — check if a user with this email exists
      const existingUser = await tx.user.findUnique({
        where: { email: profile.email },
      });

      if (existingUser) {
        // Link new Google account to existing user (upsert guards the unique constraint)
        await tx.account.upsert({
          where: {
            provider_provider_account_id: {
              provider: "GOOGLE",
              provider_account_id: profile.id,
            },
          },
          update: {
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_at: expiresAt,
          },
          create: {
            user_id: existingUser.id,
            type: "OAUTH",
            provider: "GOOGLE",
            provider_account_id: profile.id,
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_at: expiresAt,
          },
        });

        // Auto-verify email if coming from trusted Google login
        if (!existingUser.email_verified) {
          return await tx.user.update({
            where: { id: existingUser.id },
            data: {
              email_verified: true,
              image: existingUser.image ?? profile.image,
            },
          });
        }
        return existingUser;
      }

      // 3. Brand new user — create user + linked Google account atomically
      const newUser = await tx.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          image: profile.image,
          email_verified: true,
          status: "APPROVED",
          accounts: {
            create: {
              type: "OAUTH",
              provider: "GOOGLE",
              provider_account_id: profile.id,
              access_token: accessToken,
              refresh_token: refreshToken,
              access_token_expires_at: expiresAt,
            },
          },
        },
      });

      return newUser;
    });
  } catch (err) {
    // P2002 = unique constraint violation (parallel request already created it)
    // Retry once by simply fetching the now-existing account
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const account = await prisma.account.findUnique({
        where: {
          provider_provider_account_id: {
            provider: "GOOGLE",
            provider_account_id: profile.id,
          },
        },
        include: { user: true },
      });

      if (account) {
        // Refresh the tokens on the account the other request just created
        await prisma.account.update({
          where: { id: account.id },
          data: {
            access_token: accessToken,
            refresh_token: refreshToken,
            access_token_expires_at: expiresAt,
          },
        });
        return account.user;
      }
    }
    throw err;
  }
}

export function googleRedirectController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { redirect } = req.body as { redirect?: string };

    if (redirect && !isValidRedirectUrl(redirect)) {
      throw new AppError(
        "Invalid redirect URL. Origin not allowed.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const state = generateState(redirect);
    const url = getGoogleAuthUrl(state);
    return res.respond({ url, state });
  } catch (error) {
    return next(error);
  }
}

export async function googleCallbackController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      throw new AppError(
        `Google Sign-in failed: ${error}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    if (!code || !state) {
      throw new AppError(
        "Invalid request. Missing Code and state.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // 1. Validate state
    const { valid, redirect } = validateState(state);

    if (!valid) {
      throw new AppError(
        "Invalid or expired OAuth state.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // 2. Exchange code for tokens
    const {
      profile,
      accessToken: googleAccessToken,
      refreshToken: googleRefreshToken,
      expiresAt: googleExpiresAt,
    } = await exchangeGoogleCode(code);

    // 3. Find or Create User
    const user = await findOrCreateOAuthUser(
      profile,
      googleAccessToken,
      googleRefreshToken,
      googleExpiresAt,
    );

    // 4. Create Session
    const ip = req.ip ?? "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";
    const { accessToken, refreshToken, expiresAt } = await createSession(
      user,
      ip,
      ua,
    );

    // 5. Set Cookies (matching auth.controller logic)
    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_ACCESS_EXPIRES_IN),
    });

    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_REFRESH_EXPIRES_IN),
    });

    if (redirect) {
      if (isValidRedirectUrl(redirect)) {
        return res.redirect(`${redirect}?auth=success`);
      }
    }

    // 6. Final success response
    return res.status(HTTP_STATUS.OK).respond({
      message: "Google sign-in successful.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}
