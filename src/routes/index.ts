import { Router, Request, Response, NextFunction } from "express";
import v1Routes from "./v1";
import { HTTP_STATUS } from "../utils/http-status";

const router = Router();

router.use("/v1", v1Routes);

router.get("/health", (_req: Request, res: Response, next: NextFunction) => {
  try {
    return res
      .status(HTTP_STATUS.OK)
      .respond({ timestamp: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

export default router;
