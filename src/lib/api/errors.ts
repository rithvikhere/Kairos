import { ZodError } from "zod";
import { ProjectNotEmptyError } from "../../data/schema.js";
import { InvalidScenarioError } from "../../domain/simulation.js";
import { type ErrorCode, fail } from "./respond.js";

/**
 * Custom error carrying HTTP status code and error category code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Centralized route error handler mapping known domain/data errors to specific
 * HTTP statuses and codes, while shielding internal details on unexpected 500 errors.
 */
export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) {
    return fail(err.status, err.code, err.message);
  }

  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return fail(400, "VALIDATION_ERROR", formatted || "Invalid request payload");
  }

  if (err instanceof ProjectNotEmptyError) {
    return fail(409, "PROJECT_NOT_EMPTY", err.message);
  }

  if (err instanceof InvalidScenarioError) {
    return fail(400, "VALIDATION_ERROR", err.message);
  }

  // Unexpected errors: log to server console, do not leak stack traces
  console.error("Unhandled API route error:", err);
  return fail(500, "INTERNAL_ERROR", "An unexpected internal server error occurred.");
}
