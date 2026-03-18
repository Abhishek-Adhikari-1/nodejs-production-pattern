import { NextFunction, Request, Response } from "express";
import { hashPassword, verifyPassword } from "../utils/password";
import prisma from "../config/prisma";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";
import {
  COOKIE_OPTIONS,
  generateSecureToken,
  getVerificationExpiry,
  parseDuration,
  verifyRefreshToken,
} from "../utils/tokens";
import { assertValidUser } from "../utils/user-guards";
import {
  createSession,
  revokeAllUserSessions,
  revokeSession,
  updateSession,
} from "../services/session.service";
import {
  assertAuthenticated,
  extractBearerToken,
} from "../middlewares/auth.middleware";
import { envConfig } from "../config/env-config";
import { Prisma } from "@prisma/client";

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    const hashedPassword = await hashPassword(password);
    const token = generateSecureToken();

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: String(name),
          email: String(email),
          accounts: {
            create: {
              type: "EMAIL",
              provider: "CREDENTIALS",
              provider_account_id: String(email),
              password: String(hashedPassword),
            },
          },
          verifications: {
            create: {
              email: String(email),
              token: String(token),
              type: "EMAIL_VERIFICATION",
              expires_at: getVerificationExpiry(1),
            },
          },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new AppError(
          "Registration failed. Email already in use.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw err;
    }

    return res.status(HTTP_STATUS.CREATED).respond({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        image: user.image,
      },
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmailController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.body as { token: string };

    await prisma.$transaction(async (tx) => {
      // 1. Find verification token
      const verification = await tx.verification.findFirst({
        where: {
          token: String(token),
          type: "EMAIL_VERIFICATION",
          used_at: null,
          expires_at: { gt: new Date() },
        },
      });

      if (!verification) {
        throw new AppError(
          "Invalid or expired verification token.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      // 2. Mark user as verified
      await tx.user.update({
        where: { id: verification.user_id, email_verified: false },
        data: { email_verified: true },
      });

      // 3. Mark current token as used
      await tx.verification.update({
        where: { id: verification.id },
        data: { used_at: new Date() },
      });
    });

    return res.status(HTTP_STATUS.OK).respond({
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };
    const ip = req.ip ?? "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";

    const user = await prisma.user.findUnique({
      where: { email: String(email) },
      include: {
        accounts: { where: { provider: "CREDENTIALS" } },
      },
    });

    if (!user) {
      throw new AppError("User not found.", HTTP_STATUS.NOT_FOUND);
    }

    const account = user.accounts[0];
    const isValid = account?.password
      ? await verifyPassword(password, account.password)
      : await hashPassword(password).then(() => false);

    if (!isValid) {
      throw new AppError(
        "Invalid email or password.",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    // Assert the user is approved, email verified, and not deleted
    assertValidUser(user);

    // Create session and generate tokens
    const { accessToken, refreshToken, expiresAt } = await createSession(
      user,
      ip,
      ua,
    );

    res.cookie("access_token", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_ACCESS_EXPIRES_IN),
    });

    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_REFRESH_EXPIRES_IN),
    });

    return res.status(HTTP_STATUS.OK).respond({
      message: "Login successful.",
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

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertAuthenticated(req);

    if (req.session) {
      await revokeSession(req.session.id);
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.status(HTTP_STATUS.OK).respond({
      message: "Logged out successfully.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function logoutAllController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    assertAuthenticated(req);

    if (req.session) {
      await revokeAllUserSessions(req.user.id, req.session.id);
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    return res.status(HTTP_STATUS.OK).respond({
      message: "Logged out from all devices.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function refreshTokenController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = extractBearerToken(req) ?? req.cookies?.refresh_token;
    const ip = req.ip ?? "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";
    if (!token)
      throw new AppError("Refresh token not found.", HTTP_STATUS.UNAUTHORIZED);

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
      throw new AppError(
        "Invalid or expired refresh token",
        HTTP_STATUS.UNAUTHORIZED,
      );
    }

    if (payload.type !== "refresh")
      throw new AppError("Invalid refresh token.", HTTP_STATUS.UNAUTHORIZED);

    const tokens = await updateSession(payload.sessionId, ip, ua);

    res.cookie("access_token", tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_ACCESS_EXPIRES_IN),
    });
    res.cookie("refresh_token", tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: parseDuration(envConfig.JWT_REFRESH_EXPIRES_IN),
    });

    return res.status(HTTP_STATUS.OK).respond({
      message: "Refresh token successful.",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
}

export async function sendVerificationController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({
      where: { email: String(email), email_verified: false },
    });

    if (!user) {
      throw new AppError("User not found.", HTTP_STATUS.NOT_FOUND);
    }

    const token = generateSecureToken();

    await prisma.$transaction(async (tx) => {
      // 1. Delete all other verification tokens
      await tx.verification.deleteMany({
        where: {
          user_id: user.id,
          type: "EMAIL_VERIFICATION",
        },
      });

      // 2. Create new verification token
      await tx.verification.create({
        data: {
          email: String(email),
          token: String(token),
          type: "EMAIL_VERIFICATION",
          expires_at: getVerificationExpiry(1),
          user_id: user.id,
        },
      });
    });

    return res.status(HTTP_STATUS.OK).respond({
      message: "Verification email sent successfully.",
    });
  } catch (error) {
    return next(error);
  }
}
