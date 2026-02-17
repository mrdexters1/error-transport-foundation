import { InfrastructureError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";

/**
 * Represents a low-level network failure (DNS, TCP, Connection Refused).
 * Indicates that the request likely never reached the server or the connection was broken.
 */
export class NetworkError extends InfrastructureError {
  static is(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }

  readonly code = ErrorCodes.NETWORK_ERROR;
  readonly retryable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
