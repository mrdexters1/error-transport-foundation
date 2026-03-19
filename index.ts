/**
 * Foundation - Main Entry Point (Isomorphic)
 *
 * This is the minimal public API. Keep it clean.
 * For internal/advanced use, import directly from specific modules.
 */

export { fetchGraphQL } from "./client/fetch-graphql";
export { fetchInternal } from "./client/fetch-internal";
// ============================================================================
// Client (HTTP)
// ============================================================================
export { fetchJSON } from "./client/fetch-json";
export type { LogData, LoggerProvider, LogLevel } from "./core/logger/logger";
// ============================================================================
// Logger
// ============================================================================
export { logger } from "./core/logger/logger";
export { ifWindow, isServer } from "./core/runtime/runtime";
// ============================================================================
// Core Utilities
// ============================================================================
export {
  isBoolean,
  isNotNullish,
  isNullish,
  isNumber,
  isRecord,
  isString,
} from "./core/utils/guards";
// ============================================================================
// Validation
// ============================================================================
export {
  asBoolean,
  asDate,
  asNumber,
  asNumberInRange,
  asOptional,
  asString,
  asStringNonEmpty,
  asStringRegex,
  asValueOfEnum,
} from "./core/validation/as-type";
// ============================================================================
// Core Errors
// ============================================================================
export {
  ApplicationError,
  BaseError,
  DomainError,
  InfrastructureError,
} from "./errors/core/base-error";
export { ErrorCodes } from "./errors/core/error-codes";
// ============================================================================
// Domain Errors
// ============================================================================
export {
  ConflictError,
  ForbiddenError,
  InvalidParamError,
  MethodNotAllowedError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
} from "./errors/domain/domain-errors";
export { ValidationError } from "./errors/domain/validation-error";
export type {
  ActionResponse,
  ApiErrorMeta,
  ApiErrorResponse,
} from "./errors/processing/api-error.types";
// ============================================================================
// Error Processing
// ============================================================================
export { classifyError } from "./errors/processing/classify-error";
export { getErrorPolicy } from "./errors/processing/error-policy";
export {
  isApiErrorResponse,
  toApiErrorResponse,
  toUiError,
} from "./errors/processing/error-response";
export { mapToHttpError } from "./errors/processing/http-mapper";
export { ApiResponseError } from "./errors/infrastructure/api-response-error";
// ============================================================================
// Infrastructure Errors
// ============================================================================
export { FetchError } from "./errors/infrastructure/fetch-error";
export { GraphQLUpstreamError } from "./errors/infrastructure/graphql-error";
export type { HttpStatusCode } from "./errors/infrastructure/http-status";
export { HttpStatus } from "./errors/infrastructure/http-status";
export { NetworkError } from "./errors/infrastructure/network-error";
export {
  CircuitOpenError,
  TimeoutError,
} from "./errors/infrastructure/resilience-errors";
// ============================================================================
// Unexpected Errors
// ============================================================================
export { UnexpectedError } from "./errors/unexpected/unexpected-error";
export type { HttpMethod } from "./http/http-method";
// ============================================================================
// HTTP Helpers
// ============================================================================
export { HTTP_METHODS } from "./http/http-method";
export { safeParseJson } from "./http/safe-parse-json";
