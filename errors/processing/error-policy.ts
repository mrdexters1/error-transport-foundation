import type { BaseError } from "../core/base-error";
import { ValidationError } from "../domain/validation-error";
import { ApiResponseError } from "../transport/api-response-error";

export type ErrorPolicy = {
  shouldReport: boolean;
  shouldAlert: boolean;
  shouldExpose: boolean;
  logLevel: "error" | "warn" | "info";
};

/**
 * Decides how to handle a classified error: logging, reporting, exposure.
 */
export const getErrorPolicy = (error: BaseError): ErrorPolicy => {
  // Validation: expected UX flow, log at info, don't report
  if (error instanceof ValidationError) {
    return {
      shouldReport: false,
      shouldAlert: false,
      shouldExpose: true,
      logLevel: "info",
    };
  }

  // Upstream API errors (fetchInternal)
  if (error instanceof ApiResponseError) {
    // PROXY MODE: error is expected part of flow (e.g. 422 from backend)
    // We pass through the backend message to the user
    if (error.mode === "proxy") {
      return {
        shouldReport: false,
        shouldAlert: false,
        shouldExpose: true,
        logLevel: error.status >= 500 ? "warn" : "info",
      };
    }

    // INTEGRATION MODE: we broke the contract or backend is down
    // 400 = our bug (bad request), 500 = infra/backend bug
    return {
      shouldReport: true,
      shouldAlert: error.status >= 500,
      shouldExpose: false,
      logLevel: "error",
    };
  }

  // Domain: operational but not critical (e.g. "Email taken")
  if (error.layer === "domain") {
    return {
      shouldReport: false,
      shouldAlert: false,
      shouldExpose: true,
      logLevel: "warn",
    };
  }

  // Infrastructure: report all, alert if non-retryable
  if (error.layer === "infrastructure") {
    return {
      shouldReport: true,
      shouldAlert: !error.retryable,
      shouldExpose: false,
      logLevel: "error",
    };
  }

  // Application/programmer errors: critical, always alert
  return {
    shouldReport: true,
    shouldAlert: true,
    shouldExpose: false,
    logLevel: "error",
  };
};
