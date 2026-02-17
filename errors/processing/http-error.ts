import type { HttpStatusCode } from "../transport/http-status";
import type { ApiErrorMeta } from "./api-error.types";

/**
 * Transport-level error model.
 * A "dumb" DTO that carries data to the final response.
 * No business logic or decisions are made here.
 */
export class HttpError {
  /** Machine-readable code */
  readonly code: string;
  /** HTTP status code */
  readonly status: HttpStatusCode;
  /** Human-readable message (safe to show if expose is true) */
  readonly message: string;
  /** Should the message and meta be exposed to the client? */
  readonly expose: boolean;
  /** The architectural layer where error originated */
  readonly layer: string;
  /** Structured metadata */
  readonly meta?: ApiErrorMeta;
  /** Hint for the UI to show a retry button */
  readonly retryable: boolean;

  constructor(params: {
    code: string;
    status: HttpStatusCode;
    message: string;
    expose: boolean;
    layer: string;
    retryable: boolean;
    meta?: ApiErrorMeta;
  }) {
    this.code = params.code;
    this.status = params.status;
    this.message = params.message;
    this.expose = params.expose;
    this.layer = params.layer;
    this.retryable = params.retryable;
    this.meta = params.meta;
  }

  /**
   * Helper to check if an object is an HttpError.
   * Uses property check to support serialized objects.
   */
  static is(error: unknown): error is HttpError {
    return (
      error instanceof HttpError ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "status" in error &&
        "expose" in error)
    );
  }
}
