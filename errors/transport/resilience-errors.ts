import { InfrastructureError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";

/**
 * Error thrown when a circuit breaker is open.
 * Infrastructure-level: represents a failure in external service availability.
 */
export class CircuitOpenError extends InfrastructureError {
  static is(err: unknown): err is CircuitOpenError {
    return err instanceof CircuitOpenError;
  }

  readonly code = ErrorCodes.CIRCUIT_OPEN_ERROR;
  readonly retryable = true; // Safe to retry after some time
  readonly circuitName: string;
  readonly resetAt: number;

  constructor(circuitName: string, resetAt: number) {
    const message = `Circuit breaker "${circuitName}" is open. Retry after ${new Date(resetAt).toISOString()}`;
    super(message);
    this.circuitName = circuitName;
    this.resetAt = resetAt;
  }
}

/**
 * Error thrown when a request times out.
 * Infrastructure-level: represents a timeout during external communication.
 */
export class TimeoutError extends InfrastructureError {
  static is(err: unknown): err is TimeoutError {
    return err instanceof TimeoutError;
  }

  readonly code = ErrorCodes.TIMEOUT_ERROR;
  readonly retryable = true; // Safe to retry network timeouts
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}
