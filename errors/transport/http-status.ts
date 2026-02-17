import type { ValuesOf } from "../../core/types/type.utils";

/**
 * Represents HTTP status codes.
 */
export const HttpStatus = {
  // Success
  OK: 200,
  CREATED: 201,

  // Redirect
  MOVED_PERMANENTLY: 301,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  TOO_MANY_REQUESTS: 429,
  UNPROCESSABLE_CONTENT: 422,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Union of all HTTP status codes.
 */
export type HttpStatusCode = ValuesOf<typeof HttpStatus>;

/**
 * Success status codes.
 */
export type HttpStatusSuccess =
  | typeof HttpStatus.OK
  | typeof HttpStatus.CREATED;

/**
 * Redirect status codes.
 */
export type HttpStatusRedirect =
  | typeof HttpStatus.MOVED_PERMANENTLY
  | typeof HttpStatus.SEE_OTHER
  | typeof HttpStatus.TEMPORARY_REDIRECT;

/**
 * Client error status codes.
 */
export type HttpStatusClientError =
  | typeof HttpStatus.BAD_REQUEST
  | typeof HttpStatus.UNAUTHORIZED
  | typeof HttpStatus.FORBIDDEN
  | typeof HttpStatus.NOT_FOUND
  | typeof HttpStatus.METHOD_NOT_ALLOWED
  | typeof HttpStatus.TOO_MANY_REQUESTS
  | typeof HttpStatus.UNPROCESSABLE_CONTENT;

/**
 * Server error status codes.
 */
export type HttpStatusServerError =
  | typeof HttpStatus.INTERNAL_SERVER_ERROR
  | typeof HttpStatus.NOT_IMPLEMENTED
  | typeof HttpStatus.BAD_GATEWAY
  | typeof HttpStatus.SERVICE_UNAVAILABLE
  | typeof HttpStatus.GATEWAY_TIMEOUT;
