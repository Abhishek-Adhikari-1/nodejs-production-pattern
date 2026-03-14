import { HttpStatusCode } from "../types/http-status";
import { getStatusType } from "./http-status";

export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;
  public errors?: any;

  constructor(message: string, statusCode: HttpStatusCode, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.status = getStatusType(statusCode);
    this.isOperational = true;
    this.name = this.constructor.name;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
