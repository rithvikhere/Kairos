import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "CONFIRMATION_REQUIRED"
  | "NOT_FOUND"
  | "PROJECT_NOT_EMPTY"
  | "INTERNAL_ERROR";

export interface ApiResponseSuccess<T> {
  data: T;
}

export interface ApiResponseError {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Standard success response wrapper: { data: T }
 */
export function ok<T>(data: T, status: number = 200): NextResponse<ApiResponseSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Standard error response wrapper: { error: { code, message } }
 */
export function fail(
  status: number,
  code: ErrorCode,
  message: string
): NextResponse<ApiResponseError> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
