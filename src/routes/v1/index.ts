import { Router, Request, Response, NextFunction } from "express";
import { authRouter } from "./auth.routes";

const router = Router();

router.get("/", (_req: Request, res: Response, next: NextFunction) => {
  try {
    return res.respond({
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      message: "Welcome to the API v1!",
    });
  } catch (error) {
    return next(error);
  }
});

router.use("/auth", authRouter);

export default router;
