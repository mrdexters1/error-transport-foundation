import { FetchError } from "../errors/transport/fetch-error";
import type { HttpMethod } from "../http/http-method";

/**
 * HTTP methods supported in OpenAPI
 */

const throwError = async (
  resp: Response,
  params: { method: string; json: unknown; idempotencyKey?: string },
) => {
  // If we already have the json (from type guard failure), we use it.
  // Otherwise, we try to parse the error body if resp.ok was false.
  let body = params.json;
  if (!body && !resp.bodyUsed) {
    try {
      body = await resp.json();
    } catch {
      // Body might not be JSON or already consumed
    }
  }

  throw new FetchError({
    method: params.method,
    url: resp.url,
    status: resp.status,
    statusText: resp.statusText,
    body,
    idempotencyKey: params.idempotencyKey,
  });
};

export type FetchJSONParams<T> = {
  url: string;
  method: HttpMethod;
  response?: (arg: unknown) => arg is T;
  handleBadResponse?: (
    response: Response,
    params: { method: string; json: unknown; idempotencyKey?: string },
  ) => T | Promise<T>;
  requestId?: string;
  authToken?: string;
  headers?: Partial<Record<string, string>>;
  body?: unknown;
  initParams?: Omit<RequestInit, "body" | "method" | "headers">;
  ignoreResponse?: boolean;
  /** Optional key for idempotent mutations (POST/PUT/PATCH) */
  idempotencyKey?: string;
};

/**
 * Global resolver for requestId to maintain traceability across async boundaries.
 */
let requestIdResolver: () => string | undefined = () => undefined;

export const setFetchRequestIdResolver = (
  fn: typeof requestIdResolver,
): void => {
  requestIdResolver = fn;
};

/**
 * Type-safe HTTP client with optional response validation.
 * Supports end-to-end traceability via requestId propagation.
 */
export async function fetchJSON<T = unknown>({
  url,
  body,
  authToken,
  requestId: explicitRequestId,
  headers,
  initParams,
  method,
  handleBadResponse = throwError,
  response,
  ignoreResponse = false,
  idempotencyKey,
}: FetchJSONParams<T>): Promise<T> {
  const isMultipartFormData = body instanceof FormData;

  // Auto-inject requestId from resolver if not provided explicitly (Point 1)
  const requestId = explicitRequestId || requestIdResolver();

  const resp = await fetch(url, {
    ...initParams,
    method,
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : undefined),
      ...(requestId ? { "x-request-id": requestId } : undefined),
      // Only send Idempotency-Key for mutations (Point 2)
      ...(idempotencyKey &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
        ? { "Idempotency-Key": idempotencyKey }
        : undefined),
      ...(isMultipartFormData
        ? undefined
        : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isMultipartFormData
      ? body
      : body &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
        ? JSON.stringify(body)
        : undefined,
  });

  if (!resp.ok) {
    return await handleBadResponse(resp, {
      method,
      json: undefined,
      idempotencyKey,
    });
  }

  if (ignoreResponse || resp.status === 204 || resp.status === 205) {
    return undefined as T;
  }

  // Point 2: Safety guard against misconfigured servers returning non-JSON
  const contentType = resp.headers.get("content-type")?.toLowerCase();
  const isJson = contentType?.includes("json");

  // If it's not JSON but we're here, it might be an error or misconfiguration
  if (!isJson) {
    // Custom error for non-JSON responses when JSON is expected
    throw new FetchError({
      method,
      url: resp.url,
      status: resp.status,
      statusText: resp.statusText,
      message: `Expected JSON response but received "${contentType || "nothing"}"`,
      idempotencyKey,
    });
  }

  const json = (await resp.json()) as unknown;

  // No type guard — return as T (unsafe cast)
  if (!response) {
    return json as T;
  }

  // Type guard provided — validate response
  if (!response(json)) {
    return await handleBadResponse(resp, {
      method,
      json,
      idempotencyKey,
    });
  }

  return json;
}
