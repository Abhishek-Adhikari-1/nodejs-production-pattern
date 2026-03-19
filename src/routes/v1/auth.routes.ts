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

const router = Router();

router.post("/login", validate(authSchema.login), loginController);

router.post("/register", validate(authSchema.register), registerController);

router.post(
  "/verify-email",
  validate(authSchema.verifyEmail),
  verifyEmailController,
);

router.post("/logout", authenticate, logoutController);

router.post("/logout-all", authenticate, logoutAllController);

router.post("/refresh", refreshTokenController);

router.post(
  "/resend-verification",
  validate(authSchema.resendVerification),
  sendVerificationController,
);

router.post(
  "/forgot-password",
  validate(authSchema.forgotPassword),
  forgotPasswordController,
);

router.post(
  "/reset-password",
  validate(authSchema.resetPassword),
  resetPasswordController,
);

router.get(
  "/google",
  validate(authSchema.googleLogin),
  googleRedirectController,
);

router.get("/callback/google", googleCallbackController);

export { router as authRouter };
