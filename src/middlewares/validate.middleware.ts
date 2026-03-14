import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/app-error";
import { HTTP_STATUS } from "../utils/http-status";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req?.body || {});
      if (!result.success) {
        const errors = result.error.issues;
        return next(
          new AppError(
            "Validation error",
            HTTP_STATUS.UNPROCESSABLE_ENTITY,
            errors,
          ),
        );
      }
      req.body = result.data;
      next();
    } catch (error) {
      return next(error);
    }
  };
}
