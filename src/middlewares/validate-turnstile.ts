import { Request, Response, NextFunction } from "express";
import { envConfig } from "../config/env-config";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";

interface TurnstileResponse {
  success: boolean;
  "error-codes": string[];
}

/**
 * Middleware to validate a Turnstile token (Captcha)
 */
export async function validateTurnstile(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (envConfig.NODE_ENVIRONMENT === "development") {
      return next();
    }

    const turnstileToken = req.body?.turnstileToken as string | undefined;

    if (!turnstileToken) {
      throw new AppError(
        "Turnstile token is required.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const remoteip = req.ip || "N/A";

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: envConfig.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: remoteip,
        }),
      },
    );

    const result = (await response.json()) as TurnstileResponse;

    if (!result.success) {
      throw new AppError("Invalid Captcha.", HTTP_STATUS.BAD_REQUEST);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
