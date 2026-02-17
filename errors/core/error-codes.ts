/**
 * ARCHITECTURAL RULE: Error Codes are immutable.
 * If the logic changes meaningfully, issue a NEW code instead of modifying an existing one.
 * This prevents breaking changes for client-side error handling logic.
 *
 * Format: SCREAMING_SNAKE_CASE
 */

export const ErrorCodes = {
  // Domain Errors (4xx)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
  INVALID_PARAM: "INVALID_PARAM",

  // Infrastructure/Transport Errors (502, 503, 504)
  FETCH_ERROR: "FETCH_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  CIRCUIT_OPEN_ERROR: "CIRCUIT_OPEN_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  API_RESPONSE_ERROR: "API_RESPONSE_ERROR",
  GRAPHQL_ERROR: "GRAPHQL_ERROR",

  // Application/Programmer Errors (500)
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
