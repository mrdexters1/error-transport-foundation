import { InfrastructureError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";
import { HttpStatus } from "./http-status";

/**
 * Error raised during HTTP requests.
 * Infrastructure-level: represents a failure in external communication.
 * Data-only: does not store the Response object to prevent memory leaks and serialization issues.
 */
export class FetchError extends InfrastructureError {
  static is(error: unknown): error is FetchError {
    return error instanceof FetchError;
  }

  readonly code = ErrorCodes.FETCH_ERROR;
  readonly url: string;
  readonly method: string;
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly retryable: boolean;

  constructor(params: {
    method: string;
    url: string;
    status: number;
    statusText: string;
    message?: string;
    body?: unknown;
    idempotencyKey?: string;
    cause?: unknown;
  }) {
    const message =
      params.message ??
      `Bad response. ${params.status} ${params.statusText}. Failed to ${params.method} "${params.url}"`;

    // Use HttpStatus constants instead of magic numbers
    const isRetryable =
      params.status >= HttpStatus.INTERNAL_SERVER_ERROR ||
      params.status === HttpStatus.TOO_MANY_REQUESTS;

    super(message, {
      cause: params.cause,
      retryable: isRetryable,
    });

    this.method = params.method.toUpperCase();
    this.url = params.url;
    this.status = params.status;
    this.statusText = params.statusText;
    this.body = params.body;
    this.idempotencyKey = params.idempotencyKey;
    this.retryable = isRetryable;
  }
}
