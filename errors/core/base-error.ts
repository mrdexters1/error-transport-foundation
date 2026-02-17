/**
 * Supported layers for error classification.
 */
export type ErrorLayer = "domain" | "infrastructure" | "application";

/**
 * Base contract for all application errors.
 * Focuses on immutability and architectural strictness.
 */
export abstract class BaseError extends Error {
  /**
   * Unique error code (SCREAMING_SNAKE_CASE).
   * Part of the public API contract and should remain stable.
   */
  abstract readonly code: string;

  /** Architectural layer where the error originated. Immutable in subclasses. */
  abstract readonly layer: ErrorLayer;

  /** Indicates if the operation can be safely retried. Defaults to false for Domain/Application. */
  abstract readonly retryable: boolean;

  /**
   * Indicates if the error is expected (operational) or a bug (programmer error).
   * Used for alerting and system health monitoring.
   */
  abstract readonly operational: boolean;

  /** Original cause for debugging and traceability. Follows ES2022+ standards. */
  readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      cause?: unknown;
      retryable?: boolean;
      operational?: boolean;
    } = {},
  ) {
    // ES2022 native cause support
    super(message, { cause: options.cause });

    this.name = this.constructor.name;
    this.cause = options.cause;

    // Proper prototype chain preservation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Domain-level errors (business logic violations).
 * Always operational and non-retryable by definition.
 */
export abstract class DomainError extends BaseError {
  readonly layer = "domain" as const;
  readonly retryable = false;
  readonly operational = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Infrastructure-level errors (network, database, external services).
 * Always operational, retryable depends on the specific failure.
 */
export abstract class InfrastructureError extends BaseError {
  readonly layer = "infrastructure" as const;
  readonly operational = true;
  abstract override readonly retryable: boolean;

  constructor(
    message: string,
    options?: { cause?: unknown; retryable?: boolean },
  ) {
    super(message, options);
  }
}

/**
 * Application-level errors (internal flow, configuration, forbidden states).
 * Usually represents programmer error (non-operational).
 */
export abstract class ApplicationError extends BaseError {
  readonly layer = "application" as const;
  readonly retryable = false;
  readonly operational = false;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
