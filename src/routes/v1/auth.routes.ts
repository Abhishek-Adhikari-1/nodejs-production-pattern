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
  generalLimiter,
  passwordResetLimiter,
  refreshLimiter,
} from "../../middlewares/ratelimit.middleware";

const router = Router();

router.post("/login", authLimiter, validate(authSchema.login), loginController);

router.post(
  "/register",
  authLimiter,
  validate(authSchema.register),
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
  passwordResetLimiter,
  validate(authSchema.forgotPassword),
  forgotPasswordController,
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(authSchema.resetPassword),
  resetPasswordController,
);

router.get(
  "/google",
  generalLimiter,
  validate(authSchema.googleLogin),
  googleRedirectController,
);

router.get("/callback/google", googleCallbackController);

export { router as authRouter };
