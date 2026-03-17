import { Router } from "express";
import {
  loginController,
  logoutAllController,
  logoutController,
  registerController,
  verifyEmailController,
} from "../../controllers/auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authSchema } from "../../schemas/auth.schema";
import { authenticate } from "../../middlewares/auth.middleware";

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

export { router as authRouter };
