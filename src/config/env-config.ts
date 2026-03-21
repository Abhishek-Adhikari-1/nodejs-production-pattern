import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .trim()
    .default("8000")
    .transform((val) => parseInt(val, 10)),

  NODE_ENVIRONMENT: z
    .enum(["development", "production", "test"])
    .default("development"),

  ALLOWED_ORIGINS: z
    .string()
    .default("*")
    .transform((val) => val.split(",").map((item) => item.trim())),

  DATABASE_USER: z.string().trim().default(""),
  DATABASE_PASSWORD: z.string().trim().default(""),
  DATABASE_HOST: z.string().trim().default(""),
  DATABASE_PORT: z
    .string()
    .trim()
    .default("")
    .transform((val) => parseInt(val, 10)),
  DATABASE_NAME: z.string().trim().default(""),
  DATABASE_SSL_CA: z
    .string()
    .trim()
    .default("")
    .transform((val) => val.replace(/\\n/g, "\n")),

  JWT_ACCESS_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),

  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  JWT_ACCESS_EXPIRES_IN: z.string().trim().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().default("7d"),

  GOOGLE_CLIENT_ID: z.string().trim().default(""),
  GOOGLE_CLIENT_SECRET: z.string().trim().default(""),
  GOOGLE_REDIRECT_URI: z.string().trim().default(""),

  REDIS_URL: z.url("Must be a valid redis URL").trim().default(""),

  TURNSTILE_SECRET_KEY: z.string().trim().default(""),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const envConfig = _env.data;

export type EnvConfig = z.infer<typeof envSchema>;
