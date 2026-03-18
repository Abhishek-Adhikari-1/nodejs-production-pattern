import { z } from "zod";
import { normalizeName } from "../utils/string-format";

// --- Base field schemas ---
const nameSchema = z
  .string({ error: "Name must be a string." })
  .trim()
  .nonempty({ error: "Please enter your name." })
  .min(2, { error: "Name is too short." })
  .max(100, { error: "Name is too long." })
  .regex(/^[A-Za-z]+(\s[A-Za-z]+)?$/, {
    error: "Name can contain letters and spaces only.",
  })
  .transform((name) => normalizeName(name));

const emailSchema = z
  .email("That doesn't look like a valid email address.")
  .trim()
  .nonempty({ error: "Please enter your email address." })
  .min(2, { error: "Email address is too short." })
  .max(100, { error: "Email address is too long." })
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string({ error: "Password must be a string." })
  .nonempty({ error: "Please enter your password." })
  .min(8, { error: "Password must be at least 8 characters." })
  .regex(/^(?=.*[a-z])/, {
    error: "Password must include at least one lowercase letter.",
  })
  .regex(/^(?=.*[A-Z])/, {
    error: "Password must include at least one uppercase letter.",
  })
  .regex(/^(?=.*[!@#$%^&*()_\-+=<>?{}[\]~])/, {
    error: "Password must include at least one special character.",
  })
  .regex(/^(?=.*\d)/, { error: "Password must include at least one number." });

const tokenSchema = z
  .string({ error: "Token must be a string." })
  .trim()
  .nonempty({ error: "Verification token is required." });

// --- Full schemas ---
export const authSchema = {
  register: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  }),

  login: z.object({
    email: emailSchema,
    password: z
      .string({ error: "Password must be a string." })
      .nonempty({ error: "Please enter your password." }),
  }),

  resendVerification: z.object({ email: emailSchema }),

  forgotPassword: z.object({ email: emailSchema }),

  verifyEmail: z.object({ token: tokenSchema }),

  resetPassword: z.object({
    token: tokenSchema,
    password: passwordSchema,
  }),
};
