import { Router } from "express";
import {
  forgotPasswordController,
  loginController,
  logoutAllController,
  logoutController,
  refreshTokenController,
  registerController,
  resetPasswordController,
  sendVerificationController,
  verifyEmailController,
} from "../../controllers/auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authSchema } from "../../schemas/auth.schema";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  googleCallbackController,
  googleRedirectController,
} from "../../controllers/oauth.controller";
import {
  authLimiter,
  forgotPasswordLimiter,
  generalLimiter,
  passwordResetLimiter,
  refreshLimiter,
} from "../../middlewares/ratelimit.middleware";
import { validateTurnstile } from "../../middlewares/validate-turnstile";

const router = Router();

router.post(
  "/login",
  authLimiter,
  validate(authSchema.login),
  validateTurnstile,
  loginController,
);

router.post(
  "/register",
  authLimiter,
  validate(authSchema.register),
  validateTurnstile,
  registerController,
);

router.post(
  "/verify-email",
  authLimiter,
  validate(authSchema.verifyEmail),
  verifyEmailController,
);

router.post("/logout", authenticate, logoutController);

router.post("/logout-all", authenticate, logoutAllController);

router.post("/refresh", refreshLimiter, refreshTokenController);

router.post(
  "/resend-verification",
  validate(authSchema.resendVerification),
  sendVerificationController,
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(authSchema.forgotPassword),
  validateTurnstile,
  forgotPasswordController,
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(authSchema.resetPassword),
  validateTurnstile,
  resetPasswordController,
);

router.post(
  "/google",
  generalLimiter,
  validate(authSchema.googleLogin),
  googleRedirectController,
);

router.get("/callback/google", googleCallbackController);

export { router as authRouter };
