import { NextFunction, Request, Response } from "express";
import { hashPassword, verifyPassword } from "../utils/password";
import prisma from "../config/prisma";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";
import {
  COOKIE_OPTIONS,
  generateSecureToken,
  getVerificationExpiry,
} from "../utils/tokens";
import { assertValidUser } from "../utils/user-guards";
import {
  createSession,
  revokeAllUserSessions,
  revokeSession,
} from "../services/session.service";
import { assertAuthenticated } from "../middlewares/auth.middleware";

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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(
        "Registration failed. Try logging in or use a different email.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const hashedPassword = await hashPassword(password);
    const token = generateSecureToken();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        accounts: {
          create: {
            type: "EMAIL",
            provider: "CREDENTIALS",
            provider_account_id: email,
            password: hashedPassword,
          },
        },
        verifications: {
          create: {
            email,
            token,
            type: "EMAIL_VERIFICATION",
            expires_at: getVerificationExpiry(1),
          },
        },
      },
    });

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

    const verification = await prisma.verification.findFirst({
      where: {
        token,
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

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.user_id },
        data: { email_verified: true },
      }),
      prisma.verification.update({
        where: { id: verification.id },
        data: { used_at: new Date() },
      }),
    ]);

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
      where: { email },
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
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
