import { isNumber, isRecord, isString } from "../../core/utils/guards";
import type { ApiErrorResponse } from "./api-error.types";
import type { HttpError } from "./http-error";

const INTERNAL_SERVER_ERROR_CODE = "INTERNAL_SERVER_ERROR";
const INTERNAL_SERVER_ERROR_MSG = "Internal server error";

/**
 * Converts HttpError to API response. Anti-Leak: filters meta for 5xx errors.
 */
export const toApiErrorResponse = (
  error: HttpError,
  requestId?: string,
): ApiErrorResponse => ({
  apiVersion: "1.0",
  timestamp: new Date().toISOString(),
  code: error.code,
  message: error.expose ? error.message : INTERNAL_SERVER_ERROR_MSG,
  status: error.status,
  requestId,
  retryable: error.retryable,
  layer: error.layer,
  meta: error.expose ? error.meta : undefined,
});

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  isRecord(value) &&
  value.apiVersion === "1.0" &&
  isString(value.timestamp) &&
  isString(value.code) &&
  isString(value.message) &&
  isNumber(value.status);

/**
 * Maps any error shape to ApiErrorResponse for UI consumption.
 */
export const toUiError = (
  error: unknown,
  fallbackMessage = INTERNAL_SERVER_ERROR_MSG,
): ApiErrorResponse => {
  if (isApiErrorResponse(error)) {
    return error;
  }

  // ActionResponse failure shape: { success: false, error: ApiErrorResponse }
  if (
    isRecord(error) &&
    error.success === false &&
    isRecord(error.error) &&
    isApiErrorResponse(error.error)
  ) {
    return error.error;
  }

  return {
    apiVersion: "1.0",
    timestamp: new Date().toISOString(),
    code: INTERNAL_SERVER_ERROR_CODE,
    message: fallbackMessage,
    status: 500,
  };
};
