import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "../../../core/logger/logger";
import { requestContext } from "../../../core/runtime/request-context.server";
import { classifyError } from "../../../errors/processing/classify-error";
import { getErrorPolicy } from "../../../errors/processing/error-policy";
import { toApiErrorResponse } from "../../../errors/processing/error-response";
import { mapToHttpError } from "../../../errors/processing/http-mapper";

import { ensureFoundationInitialized } from "../init";

export const withErrorHandler = (
  handler: (req: NextRequest) => Promise<NextResponse>,
) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    ensureFoundationInitialized();
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

    return requestContext.run({ requestId }, async () => {
      try {
        return await handler(req);
      } catch (err) {
        return handleError(err, req, requestId);
      }
    });
  };
};

function handleError(
  err: unknown,
  req: NextRequest,
  requestId: string,
): NextResponse {
  // 1. Classify unknown error into BaseError
  const baseError = classifyError(err);

  // 2. Determine operational policy
  const policy = getErrorPolicy(baseError);

  // 3. Map to transport-specific HttpError
  const httpError = mapToHttpError(baseError, policy);

  // 4. Structured logging based on policy
  const logMethod = policy.logLevel as "error" | "warn" | "info";
  logger[logMethod](err instanceof Error ? err : baseError, {
    requestId,
    url: req.url,
    method: req.method,
    code: httpError.code,
    status: httpError.status,
    layer: baseError.layer,
    operational: baseError.operational,
    retryable: baseError.retryable,
    shouldReport: policy.shouldReport,
    shouldAlert: policy.shouldAlert,
  });

  const apiError = toApiErrorResponse(httpError, requestId);

  return NextResponse.json(apiError, { status: apiError.status });
}
