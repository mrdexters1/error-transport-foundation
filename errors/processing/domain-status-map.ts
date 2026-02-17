import type { ErrorCode } from "../core/error-codes";
import { ErrorCodes } from "../core/error-codes";
import type { HttpStatusCode } from "../transport/http-status";
import { HttpStatus } from "../transport/http-status";

/**
 * Registry for mapping specific domain codes to HTTP statuses.
 *
 * ARCHITECTURAL RULE:
 * 1. Only Domain errors should be mapped here.
 * 2. If a code is not here, it falls back to 400 (Bad Request) for domain layer.
 */
export const DOMAIN_STATUS_MAP: Partial<Record<ErrorCode, HttpStatusCode>> = {
  [ErrorCodes.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCodes.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCodes.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCodes.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCodes.METHOD_NOT_ALLOWED]: HttpStatus.METHOD_NOT_ALLOWED,
  [ErrorCodes.INVALID_PARAM]: HttpStatus.UNPROCESSABLE_CONTENT,
  // Future domain codes go here:
  // [ErrorCodes.INSUFFICIENT_FUNDS]: HttpStatus.PAYMENT_REQUIRED,
};
