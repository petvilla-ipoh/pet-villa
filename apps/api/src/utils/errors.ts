import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_FAILED"
  | "RESOURCE_NOT_FOUND"
  | "DOG_NOT_ELIGIBLE"
  | "BOOKING_CONFLICT"
  | "INVALID_BOOKING_STATE"
  | "PAYMENT_FAILED"
  | "REFUND_FAILED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status = 400,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
};

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      data: null,
      meta: {},
      error: { code: "VALIDATION_FAILED", message: "Invalid input.", details: error.flatten() }
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      data: null,
      meta: {},
      error: { code: error.code, message: error.message, details: error.details }
    });
    return;
  }

  res.status(500).json({
    data: null,
    meta: {},
    error: { code: "INTERNAL_ERROR", message: "Unexpected server error.", details: {} }
  });
};
