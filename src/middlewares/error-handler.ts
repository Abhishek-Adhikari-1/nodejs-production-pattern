import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";
import { envConfig } from "../config/env-config";

/**
 * Handles global errors
 * - Logs error in development mode
 * - Sends generic response in production mode
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (envConfig.NODE_ENVIRONMENT !== "production") {
    console.error(err);
  }

  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    statusCode = 500;
    message =
      envConfig.NODE_ENVIRONMENT === "production" && statusCode === 500
        ? "Internal Server Error"
        : err.message;
  }
  return res.status(statusCode).respond({ message, errors });
};
