import { Router } from "express";
import { registerController } from "../../controllers/auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authSchema } from "../../schemas/auth.schema";

const router = Router();

// router.post("/login");

router.post("/register", validate(authSchema.register), registerController);

export { router as authRouter };
