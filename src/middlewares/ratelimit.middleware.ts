import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { Request } from "express";
import { HTTP_STATUS } from "../utils/http-status";
import { envConfig } from "../config/env-config";

const redis = new Redis(envConfig.REDIS_URL, {
  ...(envConfig.REDIS_URL.startsWith("rediss://") ? { tls: {} } : {}),
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

function generateKey(req: Request) {
  const ip = req.ip ? ipKeyGenerator(req.ip) : "unknown-ip";
  const ua = req.headers["user-agent"]?.slice(0, 50) || "unknown-ua";
  const email =
    typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
  return `${ip}-${email}-${ua}`;
}

const createLimiter = (
  windowMs: number,
  max: number,
  prefix: string,
  message: string,
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message,
    },

    handler: (_req, res) => {
      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).respond({
        message,
      });
    },

    store: new RedisStore({
      sendCommand: (...args: string[]) =>
        redis.call(...(args as [string, ...string[]])) as any,
      prefix,
    }),

    keyGenerator: generateKey,
  });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const MINUTE_15 = 15 * MINUTE;

export const authLimiter = createLimiter(
  MINUTE_15,
  12,
  "auth",
  "Too many authentication attempts. Try again after 15 minutes.",
);

export const forgotPasswordLimiter = createLimiter(
  HOUR,
  7,
  "forgot-password",
  "Too many forgot password attempts. Try again after 1 hour.",
);

export const passwordResetLimiter = createLimiter(
  HOUR,
  15,
  "password-reset",
  "Too many password reset attempts. Try again after 1 hour.",
);

export const refreshLimiter = createLimiter(
  MINUTE_15,
  15,
  "refresh",
  "Too many refresh attempts. Please slow down.",
);

export const generalLimiter = createLimiter(
  MINUTE_15,
  100,
  "general",
  "Too many requests. Please slow down.",
);
