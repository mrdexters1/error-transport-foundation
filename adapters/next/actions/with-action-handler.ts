import { logger } from "../../../core/logger/logger";
import { requestContext } from "../../../core/runtime/request-context.server";
import type { ActionResponse } from "../../../errors/processing/api-error.types";
import { classifyError } from "../../../errors/processing/classify-error";
import { getErrorPolicy } from "../../../errors/processing/error-policy";
import { toApiErrorResponse } from "../../../errors/processing/error-response";
import { mapToHttpError } from "../../../errors/processing/http-mapper";
import { ensureFoundationInitialized } from "../init";

// Re-export for compatibility
export type { ActionResponse } from "../../../errors/processing/api-error.types";
/** @deprecated */
export type ActionResult<T = void> = ActionResponse<T>;

/**
 * Wraps a server action with error handling and request context.
 * Returns ActionResponse with consistent ApiErrorResponse on failure.
 */
export const withActionHandler = <TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
) => {
  return async (...args: TArgs): Promise<ActionResponse<TResult>> => {
    // Ensure the application foundation is initialized
    ensureFoundationInitialized();

    // 1. Attempt to get or generate requestId
    let requestId: string;
    try {
      const { headers } = await import("next/headers");
      const h = await headers(); // await headers() in newer Next.js
      requestId = h.get("x-request-id") ?? crypto.randomUUID();
    } catch {
      requestId = crypto.randomUUID();
    }

    // 2. Wrap execution in request context
    return requestContext.run({ requestId }, async () => {
      try {
        const data = await handler(...args);
        return { success: true, data };
      } catch (err) {
        // 3. Classify unknown error into BaseError
        const baseError = classifyError(err);

        // 4. Determine operational policy
        const policy = getErrorPolicy(baseError);

        // 5. Map to transport-specific HttpError
        const httpError = mapToHttpError(baseError, policy);

        // 6. Structured logging based on policy
        const logMethod = policy.logLevel as "error" | "warn" | "info";
        logger[logMethod](err, {
          requestId,
          code: httpError.code,
          status: httpError.status,
          layer: baseError.layer,
          operational: baseError.operational,
          retryable: baseError.retryable,
          shouldReport: policy.shouldReport,
          shouldAlert: policy.shouldAlert,
          // stack is now handled automatically by the logger when passing 'err'
        });

        const apiError = toApiErrorResponse(httpError, requestId);

        return {
          success: false,
          error: apiError,
        };
      }
    });
  };
};
