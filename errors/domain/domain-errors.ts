import { DomainError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";

/**
 * Standard business logic error when a resource is missing.
 */
export class NotFoundError extends DomainError {
  readonly code = ErrorCodes.NOT_FOUND;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Error when a user is authenticated but lacks permission for an action.
 */
export class ForbiddenError extends DomainError {
  readonly code = ErrorCodes.FORBIDDEN;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Error when an operation requires authentication but the user is not logged in.
 */
export class UnauthorizedError extends DomainError {
  readonly code = ErrorCodes.UNAUTHORIZED;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Error for duplicate resources or business rule conflicts.
 */
export class ConflictError extends DomainError {
  readonly code = ErrorCodes.CONFLICT;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Error when an HTTP method is not supported for the route.
 */
export class MethodNotAllowedError extends DomainError {
  readonly code = ErrorCodes.METHOD_NOT_ALLOWED;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Error for invalid input parameters (usually status 422).
 */
export class InvalidParamError extends DomainError {
  readonly code = ErrorCodes.INVALID_PARAM;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
