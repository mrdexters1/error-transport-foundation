import { InfrastructureError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";
import type { ApiErrorResponse } from "../processing/api-error.types";

/**
 * Error raised when an internal API call (via fetchInternal) returns a structured ApiErrorResponse.
 * This wraps the remote error object into a typed BaseError, preserving the original status and message.
 */
export class ApiResponseError extends InfrastructureError {
  /**
   * Helper to check if an error is an ApiResponseError.
   */
  static is(error: unknown): error is ApiResponseError {
    return error instanceof ApiResponseError;
  }

  readonly code = ErrorCodes.API_RESPONSE_ERROR;
  readonly status: number;
  readonly remoteError: ApiErrorResponse;
  readonly retryable: boolean;
  readonly mode: "proxy" | "integration";

  constructor(
    remoteError: ApiErrorResponse,
    mode: "proxy" | "integration" = "integration",
  ) {
    const message = `Upstream API Error: ${remoteError.status} ${remoteError.code} - ${remoteError.message}`;

    // Determine retryability based on status or remote hint
    const isRetryable =
      remoteError.retryable === true ||
      remoteError.status >= 500 ||
      remoteError.status === 429;

    super(message, {
      cause: remoteError, // Store original error as cause
      retryable: isRetryable,
    });

    this.status = remoteError.status;
    this.remoteError = remoteError;
    this.retryable = isRetryable;
    this.mode = mode;
  }
}
