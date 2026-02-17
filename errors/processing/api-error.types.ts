/**
 * Discriminated union for typed error metadata.
 * Each error type has its own structured meta shape.
 *
 * Rules:
 * - meta: machine-readable data for programmatic handling
 * - message: human-readable text for UI
 * - code: error classification for logic branching
 * - status: HTTP transport layer
 */
export type ApiErrorMeta =
  | {
      type: "RATE_LIMIT";
      /** When the rate limit resets (ISO string or Unix timestamp) */
      retryAfter?: string | number;
      /** Current usage count */
      used?: number;
      /** Maximum allowed */
      limit?: number;
    }
  | {
      type: "VALIDATION";
      /** Field-level error messages */
      fields: Record<string, string>;
    };

/**
 * Standard error response contract for all API routes and server actions.
 * Frontend can rely on this shape for all error handling.
 *
 * @example
 * ```ts
 * // Handle error from API route
 * const response = await fetch('/api/jobs');
 * if (!response.ok) {
 *   const error: ApiErrorResponse = await response.json();
 *   handleError(error);
 * }
 *
 * // Handle error from server action
 * const result = await saveJob(data);
 * if (!result.success) {
 *   handleError(result.error);
 * }
 *
 * // Type-safe meta handling with exhaustive check
 * if (error.meta) {
 *   switch (error.meta.type) {
 *     case "RATE_LIMIT":
 *       showRetry(error.meta.retryAfter);
 *       break;
 *     case "VALIDATION":
 *       showFieldErrors(error.meta.fields);
 *       break;
 *     default:
 *       const _exhaustive: never = error.meta;
 *       // TS error if new type added without handler
 *   }
 * }
 * ```
 */
export type ApiErrorResponse = {
  /** API Contract Version */
  apiVersion: "1.0";
  /** ISO timestamp of the error occurrence */
  timestamp: string;
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: string;
  /** Human-readable message (safe to display to user for 4xx) */
  message: string;
  /** HTTP status code */
  status: number;
  /** Request correlation ID for debugging/support */
  requestId?: string;
  /** Hint for the UI to show a retry button */
  retryable?: boolean;
  /** The architectural layer where error originated */
  layer?: string;
  /** Typed metadata for specific error types */
  meta?: ApiErrorMeta;
};

/**
 * Standard result type for server actions.
 * Consistent error shape across all actions.
 *
 * @example
 * ```ts
 * export const saveJob = withActionHandler(async (data: SaveJobInput) => {
 *   // ... save logic
 *   return { id: job.id };
 * });
 *
 * // Usage
 * const result = await saveJob(data);
 * if (result.success) {
 *   console.log(result.data.id);
 * } else {
 *   toast.error(result.error.message);
 * }
 * ```
 */
export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorResponse };
