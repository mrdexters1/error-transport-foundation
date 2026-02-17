import type { BaseError } from "../core/base-error";
import type { ErrorCode } from "../core/error-codes";
import { ValidationError } from "../domain/validation-error";
import { ApiResponseError } from "../transport/api-response-error";
import { FetchError } from "../transport/fetch-error";
import type { HttpStatusCode } from "../transport/http-status";
import { HttpStatus } from "../transport/http-status";
import { NetworkError } from "../transport/network-error";
import { CircuitOpenError, TimeoutError } from "../transport/resilience-errors";
import { DOMAIN_STATUS_MAP } from "./domain-status-map";
import type { ErrorPolicy } from "./error-policy";
import { HttpError } from "./http-error";

/**
 * Maps BaseError to HttpError for transport.
 * Anti-Leak: only exposes details if policy.shouldExpose is true.
 */
export const mapToHttpError = (
  error: BaseError,
  policy: ErrorPolicy,
): HttpError => {
  const status = determineStatus(error);
  const safeMessage = policy.shouldExpose
    ? error.message
    : "Internal server error";

  return new HttpError({
    code: error.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
    status: status as HttpStatusCode,
    message: safeMessage,
    expose: policy.shouldExpose,
    layer: error.layer,
    retryable: error.retryable,
    meta:
      policy.shouldExpose && error instanceof ValidationError
        ? { type: "VALIDATION", fields: error.fields }
        : undefined,
  });
};

/**
 * Determines HTTP status for a BaseError.
 * Order: DomainError → ApiResponseError → TransportError → Fallbacks
 */
const determineStatus = (error: BaseError): HttpStatusCode => {
  // 1. ValidationError (special domain case)
  if (error instanceof ValidationError) {
    return HttpStatus.UNPROCESSABLE_CONTENT;
  }

  // 2. DomainError: use explicit mapping
  if (error.layer === "domain") {
    const mapped = DOMAIN_STATUS_MAP[error.code as ErrorCode];
    return mapped ?? HttpStatus.BAD_REQUEST;
  }

  // 3. ApiResponseError: depends on mode
  if (error instanceof ApiResponseError) {
    // PROXY: pass through upstream status (user-facing error from backend)
    if (error.mode === "proxy") {
      return error.status as HttpStatusCode;
    }
    // INTEGRATION: mask upstream details
    // 5xx → 503 (dependency down), 4xx → 502 (we sent bad request)
    return error.status >= 500
      ? HttpStatus.SERVICE_UNAVAILABLE
      : HttpStatus.BAD_GATEWAY;
  }

  // 4. Transport/Infrastructure errors
  if (error instanceof NetworkError) {
    return HttpStatus.BAD_GATEWAY;
  }
  if (error instanceof CircuitOpenError) {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
  if (error instanceof TimeoutError) {
    return error.retryable
      ? HttpStatus.SERVICE_UNAVAILABLE
      : HttpStatus.GATEWAY_TIMEOUT;
  }
  if (error instanceof FetchError) {
    if (error.status === HttpStatus.TOO_MANY_REQUESTS) {
      return HttpStatus.TOO_MANY_REQUESTS;
    }
    return HttpStatus.BAD_GATEWAY;
  }

  // 5. Unexpected/Application errors
  return HttpStatus.INTERNAL_SERVER_ERROR;
};
