import { Router } from "express";
import { loginController, registerController, verifyEmailController } from "../../controllers/auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authSchema } from "../../schemas/auth.schema";

const router = Router();

router.post("/login", validate(authSchema.login), loginController);

router.post("/register", validate(authSchema.register), registerController);

router.post("/verify-email", validate(authSchema.verifyEmail), verifyEmailController);

export { router as authRouter };
