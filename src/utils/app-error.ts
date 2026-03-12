import { HttpStatusCode } from "../types/http-status";
import { getStatusType } from "./http-status";

export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: HttpStatusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = getStatusType(statusCode);
    this.isOperational = true;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}
