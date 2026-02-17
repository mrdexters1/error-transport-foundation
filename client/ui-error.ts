/**
 * UI Error Utilities
 *
 * Bridges the gap between transport errors (ApiErrorResponse) and UI layer.
 * Framework-agnostic: no UI library dependencies (sonner, etc.).
 *
 * Architecture:
 *   transport (ApiErrorResponse) → analyzeError() → UiError → UI components
 *
 * Single entry point: analyzeError(unknown) → UiError
 * All guards and utilities work with UiError, not raw errors.
 *
 * Layer definitions (must be consistent across foundation):
 * - domain: Expected business errors (4xx)
 * - infrastructure: External dependency failures (5xx, retryable)
 * - application: Programmer errors, invalid state (always 500)
 *
 * Usage:
 *   const ui = analyzeError(result);
 *   if (ui.kind === "AUTH") redirect(ROUTES.LOGIN);
 *   if (ui.kind === "VALIDATION") applyFormErrors(ui, form);
 */

import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";
import { ErrorCodes } from "../errors/core/error-codes";
import type { ApiErrorResponse } from "../errors/processing/api-error.types";
import { toUiError } from "../errors/processing/error-response";

// ============================================================================
// Types
// ============================================================================

/**
 * Error classification for UI logic.
 * Use switch(kind) instead of checking codes/status.
 */
export type ErrorKind =
  | "AUTH" // 401, UNAUTHORIZED - redirect to login
  | "FORBIDDEN" // 403, FORBIDDEN - no access
  | "NOT_FOUND" // 404, NOT_FOUND - resource missing
  | "VALIDATION" // VALIDATION_ERROR (may or may not have fields)
  | "RATE_LIMIT" // 429, RATE_LIMIT
  | "DOMAIN" // Other 4xx domain errors
  | "DEPENDENCY" // Infrastructure: timeout, network, circuit open (502-504)
  | "UNEXPECTED"; // 500, application errors

/**
 * Options for analyzeError.
 */
export type AnalyzeErrorOptions = {
  /** Include raw ApiErrorResponse in result. Use only for debugging/logging. Default: false */
  includeRaw?: boolean;
};

/**
 * Normalized error model for UI consumption.
 * Decoupled from transport layer (ApiErrorResponse).
 */
export type UiError = {
  /** Original error code (SCREAMING_SNAKE_CASE) */
  code: string;
  /** HTTP status for reference */
  status: number;
  /** User-friendly message */
  message: string;
  /** High-level classification for UI logic */
  kind: ErrorKind;
  /** Whether retry might succeed */
  retryable: boolean;
  /** Request ID for support */
  requestId?: string;
  /** Field-level validation errors (only when kind === "VALIDATION" and fields exist) */
  validationFields: Record<string, string> | null;
  /** Rate limit info (only when kind === "RATE_LIMIT") */
  rateLimitInfo: {
    retryAfter?: string | number;
    used?: number;
    limit?: number;
  } | null;
  /** Original ApiErrorResponse. Only present when includeRaw: true. Use for logging, not UI. */
  raw?: ApiErrorResponse;
};

/**
 * Root error paths in react-hook-form.
 * "root" is special and not part of Path<T>.
 */
type RootPath = "root" | `root.${string}`;

/**
 * Combined path type for form errors.
 */
export type FormPath<T extends FieldValues> = Path<T> | RootPath;

/**
 * Options for applyFormErrors.
 */
export type ApplyFormErrorsOptions<T extends FieldValues> = {
  /**
   * Field to use for DOMAIN/NOT_FOUND/FORBIDDEN errors.
   * VALIDATION, AUTH, DEPENDENCY always use root.
   * Defaults to root.
   */
  fallbackField?: Path<T>;
  /** Root key for form-level errors. Defaults to "root". */
  rootKey?: RootPath;
  /** Maps server field names to form field names (e.g., { email_address: "email" }). */
  fieldMap?: Partial<Record<string, Path<T>>>;
  /** If false, auth errors won't be applied to form (for redirect handling). Defaults to true. */
  applyAuthErrors?: boolean;
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Error kinds that always go to root (form-level).
 * These are never placed on specific fields:
 * - VALIDATION without fields (form-level validation)
 * - AUTH (authentication is not a field problem)
 * - DEPENDENCY (server unavailable)
 * - RATE_LIMIT (throttling)
 * - UNEXPECTED (system error)
 */
const ALWAYS_ROOT_KINDS: ReadonlySet<ErrorKind> = new Set([
  "VALIDATION",
  "AUTH",
  "DEPENDENCY",
  "RATE_LIMIT",
  "UNEXPECTED",
]);

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Extracts validation fields from ApiErrorResponse.
 * Single source of truth for validation meta parsing.
 */
function extractValidationFields(
  e: ApiErrorResponse,
): Record<string, string> | null {
  if (
    e.meta?.type === "VALIDATION" &&
    typeof e.meta.fields === "object" &&
    e.meta.fields !== null
  ) {
    return e.meta.fields as Record<string, string>;
  }
  return null;
}

/**
 * Extracts rate limit info from ApiErrorResponse.
 * Supports both meta and bare 429 status.
 */
function extractRateLimitInfo(
  e: ApiErrorResponse,
): { retryAfter?: string | number; used?: number; limit?: number } | null {
  if (e.meta?.type === "RATE_LIMIT") {
    return {
      retryAfter: e.meta.retryAfter,
      used: e.meta.used,
      limit: e.meta.limit,
    };
  }
  // 429 without meta - return empty info so caller knows it's rate limited
  if (e.status === 429) {
    return {};
  }
  return null;
}

/**
 * Determines error kind from ApiErrorResponse.
 * Priority: rate limit (special) → layer → specific codes → status fallback
 */
function determineKind(e: ApiErrorResponse): ErrorKind {
  // Rate limit has priority (even over infrastructure layer)
  // because it requires specific UI handling (countdown, retry-after)
  if (e.status === 429 || e.meta?.type === "RATE_LIMIT") {
    return "RATE_LIMIT";
  }

  // Layer-based classification (when layer is explicitly set)
  if (e.layer === "infrastructure") {
    return "DEPENDENCY";
  }
  if (e.layer === "application") {
    return "UNEXPECTED";
  }

  // Auth errors (401 or UNAUTHORIZED code)
  if (e.status === 401 || e.code === ErrorCodes.UNAUTHORIZED) {
    return "AUTH";
  }

  // Forbidden (403)
  if (e.status === 403 || e.code === ErrorCodes.FORBIDDEN) {
    return "FORBIDDEN";
  }

  // Not found (404)
  if (e.status === 404 || e.code === ErrorCodes.NOT_FOUND) {
    return "NOT_FOUND";
  }

  // Validation error (by code, regardless of fields presence)
  if (e.code === ErrorCodes.VALIDATION_ERROR) {
    return "VALIDATION";
  }

  // Status-based fallback for dependency errors (when layer not set)
  // 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
  if (e.status === 502 || e.status === 503 || e.status === 504) {
    return "DEPENDENCY";
  }

  // 5xx or unexpected error code
  if (e.status >= 500 || e.code === ErrorCodes.UNEXPECTED_ERROR) {
    return "UNEXPECTED";
  }

  // Other domain errors (4xx)
  return "DOMAIN";
}

/**
 * Isolated wrapper for form.setError to handle RootPath typing.
 */
function setFormError<T extends FieldValues>(
  form: UseFormReturn<T>,
  field: FormPath<T>,
  message: string,
): void {
  // RHF accepts "root" and "root.xxx" but it's not in Path<T>
  // Single place for this cast
  form.setError(field as Parameters<typeof form.setError>[0], { message });
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Analyzes any error and returns normalized UiError.
 * This is the SINGLE entry point for error normalization.
 *
 * Call this ONCE and use the result for all UI logic.
 *
 * @param error - Any error (ActionResponse, ApiErrorResponse, Error, unknown)
 * @param fallbackMessage - Message to use if error cannot be parsed
 * @param options - { includeRaw: true } to include original for logging
 *
 * @example
 * ```ts
 * const ui = analyzeError(result);
 *
 * switch (ui.kind) {
 *   case "AUTH":
 *     redirect(ROUTES.LOGIN);
 *     break;
 *   case "VALIDATION":
 *     applyFormErrors(ui, form);
 *     break;
 *   case "RATE_LIMIT":
 *     showRateLimitMessage(ui.rateLimitInfo?.retryAfter);
 *     break;
 *   case "DEPENDENCY":
 *     if (ui.retryable) showRetryButton();
 *     break;
 *   default:
 *     toast.error(ui.message);
 * }
 * ```
 *
 * @example With raw for logging
 * ```ts
 * const ui = analyzeError(result, undefined, { includeRaw: true });
 * logger.error(ui.raw, { kind: ui.kind });
 * ```
 */
export function analyzeError(
  error: unknown,
  fallbackMessage?: string,
  options?: AnalyzeErrorOptions,
): UiError {
  const e = toUiError(error, fallbackMessage);

  return {
    code: e.code,
    status: e.status,
    message: e.message,
    kind: determineKind(e),
    retryable: e.retryable === true,
    requestId: e.requestId,
    validationFields: extractValidationFields(e),
    rateLimitInfo: extractRateLimitInfo(e),
    raw: options?.includeRaw ? e : undefined,
  };
}

// ============================================================================
// Type Guards (work with UiError)
// ============================================================================

/**
 * Checks if error has field-level validation errors.
 * Note: kind === "VALIDATION" may not have fields (form-level validation).
 * Type guard: narrows validationFields to non-null.
 */
export function hasFieldErrors(
  ui: UiError,
): ui is UiError & { validationFields: Record<string, string> } {
  return (
    ui.validationFields !== null && Object.keys(ui.validationFields).length > 0
  );
}

/**
 * Checks if error should trigger redirect to login.
 * Use this for centralized redirect logic.
 */
export function shouldRedirectToLogin(ui: UiError): boolean {
  return ui.kind === "AUTH";
}

// ============================================================================
// Form Integration
// ============================================================================

/**
 * Applies UiError to react-hook-form.
 *
 * Behavior (predictable placement rules):
 * - VALIDATION with fields → maps to form fields
 * - VALIDATION without fields → root (form-level error)
 * - AUTH → root (unless applyAuthErrors: false for redirect)
 * - DEPENDENCY → root (infrastructure errors are form-level)
 * - RATE_LIMIT → root
 * - UNEXPECTED → root
 * - DOMAIN/NOT_FOUND/FORBIDDEN → fallbackField or root
 *
 * @param ui - Already analyzed error (use analyzeError first)
 * @param form - react-hook-form instance
 * @param options - Configuration options
 * @returns true if errors were applied, false if skipped
 *
 * @example
 * ```ts
 * const ui = analyzeError(result);
 *
 * if (shouldRedirectToLogin(ui)) {
 *   redirect(ROUTES.LOGIN);
 *   return;
 * }
 *
 * applyFormErrors(ui, form);
 * ```
 *
 * @example With field mapping
 * ```ts
 * const ui = analyzeError(result);
 * applyFormErrors(ui, form, {
 *   fieldMap: { email_address: "email", full_name: "name" }
 * });
 * ```
 */
export function applyFormErrors<T extends FieldValues>(
  ui: UiError,
  form: UseFormReturn<T>,
  options: ApplyFormErrorsOptions<T> = {},
): boolean {
  const rootKey = options.rootKey ?? "root";

  // VALIDATION with field-level details → apply to form fields
  if (ui.kind === "VALIDATION" && hasFieldErrors(ui)) {
    const fieldMap = options.fieldMap ?? {};

    for (const [serverField, message] of Object.entries(ui.validationFields)) {
      const formField = fieldMap[serverField] ?? (serverField as Path<T>);
      setFormError(form, formField, message);
    }
    return true;
  }

  // Skip auth errors if caller wants to handle separately (e.g., redirect)
  if (ui.kind === "AUTH" && options.applyAuthErrors === false) {
    return false;
  }

  // Error kinds that always go to root (form-level)
  if (ALWAYS_ROOT_KINDS.has(ui.kind)) {
    setFormError(form, rootKey, ui.message);
    return true;
  }

  // DOMAIN, NOT_FOUND, FORBIDDEN → fallbackField or root
  const target: FormPath<T> = options.fallbackField ?? rootKey;
  setFormError(form, target, ui.message);
  return true;
}

// ============================================================================
// Form Utilities
// ============================================================================

/**
 * Field error with path information.
 */
type FieldError = {
  /** Dot-notation path to the field (e.g., "user.email" or "addresses.0.street") */
  path: string;
  /** Error message */
  message: string;
};

/**
 * Gets the first field error from form state.
 * Handles nested form structures and arrays recursively.
 *
 * @example
 * ```ts
 * const first = getFirstFieldError(form.formState.errors);
 * if (first) {
 *   const el = document.querySelector(`[name="${first.path}"]`);
 *   el?.scrollIntoView({ behavior: "smooth", block: "center" });
 * }
 * ```
 */
export function getFirstFieldError(
  errors: FieldErrors,
  parentPath = "",
): FieldError | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    // Direct error with message
    if (
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string" &&
      value.message
    ) {
      return { path: currentPath, message: value.message };
    }

    // Array of errors (e.g., addresses[0], addresses[1])
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (item) {
          const nested = getFirstFieldError(
            item as FieldErrors,
            `${currentPath}.${i}`,
          );
          if (nested) return nested;
        }
      }
      continue;
    }

    // Nested object (e.g., user.email)
    if (typeof value === "object") {
      const nested = getFirstFieldError(value as FieldErrors, currentPath);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Clears root error from form state.
 * Call this when user starts typing to dismiss server errors.
 *
 * @example
 * ```ts
 * <Input
 *   {...field}
 *   onChange={(e) => {
 *     field.onChange(e);
 *     clearRootError(form);
 *   }}
 * />
 * ```
 */
export function clearRootError<T extends FieldValues>(
  form: UseFormReturn<T>,
  rootKey: RootPath = "root",
): void {
  form.clearErrors(rootKey as Parameters<typeof form.clearErrors>[0]);
}

// ============================================================================
// Message Extraction
// ============================================================================

/**
 * Extracts user-friendly message from any error.
 * Use in app layer with toast library.
 *
 * @example
 * ```ts
 * // In app layer (not foundation)
 * import { toast } from "sonner";
 * import { getErrorMessage } from "@/foundation/client";
 *
 * toast.error(getErrorMessage(error, "Failed to save"));
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An error occurred",
): string {
  return analyzeError(error, fallback).message;
}
