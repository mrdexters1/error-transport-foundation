import { isApiErrorResponse } from "../errors/processing/error-response";
import { ApiResponseError } from "../errors/transport/api-response-error";
import { FetchError } from "../errors/transport/fetch-error";
import { type FetchJSONParams, fetchJSON } from "./fetch-json";

export type FetchInternalParams<T> = Omit<
  FetchJSONParams<T>,
  "handleBadResponse"
> & {
  /**
   * Base path for internal API routes.
   * @default "/api"
   */
  apiBase?: string;
  /**
   * Execution mode for this request:
   * - "integration" (default): Treat 4xx/5xx as errors that should be reported (internal integration failure).
   * - "proxy": We are simply proxying this request. 4xx errors are expected and should be passed through to the user without alerting.
   */
  mode?: "proxy" | "integration";
};

/**
 * Specialized wrapper for internal API requests (/api/*).
 * Automatically understands ApiErrorResponse and throws it natively as ApiResponseError.
 */
export async function fetchInternal<T>(
  params: FetchInternalParams<T>,
): Promise<T> {
  const apiBase = params.apiBase ?? "/api";
  const url = params.url.startsWith("/") ? params.url : `/${params.url}`;
  const fullUrl = `${apiBase}${url}`;
  const mode = params.mode ?? "integration"; // Default to integration mode

  return await fetchJSON<T>({
    ...params,
    url: fullUrl,
    handleBadResponse: async (resp, ctx) => {
      // Deterministic body consumption: read as text once (Point 1)
      const rawText = await resp.text().catch(() => undefined);
      let errorBody: unknown;

      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (isApiErrorResponse(parsed)) {
            // Throw API error wrapped in ApiResponseError (InfrastructureError)
            throw new ApiResponseError(parsed, mode);
          }
          errorBody = parsed;
        } catch (err) {
          // If we re-throw ApiResponseError, preserve it
          if (err instanceof ApiResponseError) throw err;
          // Fallback to raw text if not valid JSON
          errorBody = rawText;
        }
      }

      throw new FetchError({
        method: ctx.method,
        url: resp.url,
        status: resp.status,
        statusText: resp.statusText,
        body: errorBody,
        idempotencyKey: ctx.idempotencyKey,
      });
    },
  });
}
