import { FetchError } from "../errors/infrastructure/fetch-error";
import { NetworkError } from "../errors/infrastructure/network-error";
import type { HttpMethod } from "../http/http-method";
import { isServer } from "../core/runtime/runtime";

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
  /** Schema for response validation (e.g. Zod or similar .parse() compatible) */
  schema?: { parse: (data: unknown) => T };
  /** Optional key for idempotent mutations (POST/PUT/PATCH) */
  idempotencyKey?: string;
  /** Security: SSRF safeguards for server-side requests */
  ssrf?: {
    /** Allow only specific hostnames (e.g. ['api.stripe.com']) */
    allowList?: string[];
    /** Block requests to private network / metadata IPs (default: true on server) */
    blockPrivateIPs?: boolean;
    /** Allowed protocols (default: ['http:', 'https:']) */
    allowedProtocols?: string[];
  };
};

/**
 * Global resolver for requestId to maintain traceability across async boundaries.
 * Automatically hooks into requestContext on server-side.
 */
let requestIdResolver: () => string | undefined = () => {
  if (isServer()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { requestContext } = require("../core/runtime/request-context.server");
      return requestContext.getRequestId();
    } catch {
      return undefined;
    }
  }
  return undefined;
};

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
  schema,
  ignoreResponse = false,
  idempotencyKey,
  ssrf,
}: FetchJSONParams<T>): Promise<T> {
  const isFormBody =
    body instanceof FormData || body instanceof URLSearchParams;

  // SSRF Protection (Server-side only)
  if (isServer()) {
    try {
      const parsedUrl = new URL(url);
      const options = {
        allowedProtocols: ssrf?.allowedProtocols || ["http:", "https:"],
        blockPrivateIPs: ssrf?.blockPrivateIPs ?? true,
        allowList: ssrf?.allowList,
      };

      // 1. Protocol check
      if (!options.allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Forbidden protocol: ${parsedUrl.protocol}`);
      }

      // 2. AllowList check (if provided)
      if (options.allowList && !options.allowList.includes(parsedUrl.hostname)) {
        throw new Error(`Hostname not in allowList: ${parsedUrl.hostname}`);
      }

      // 3. Private IP / Metadata check (Best effort via hostname)
      if (options.blockPrivateIPs) {
        const privateRanges = [
          "localhost",
          "127.0.0.1",
          "169.254.169.254", // Cloud metadata
          "10.", // Class A
          "172.16.", // Class B
          "192.168.", // Class C
        ];
        if (privateRanges.some((range) => parsedUrl.hostname.startsWith(range))) {
          throw new Error(`Restricted IP/Hostname blocked: ${parsedUrl.hostname}`);
        }
      }
    } catch (err) {
      throw new NetworkError(
        `SSRF Blocked: ${err instanceof Error ? err.message : "Invalid URL"}`,
        { cause: err },
      );
    }
  }

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
      ...(isFormBody ? undefined : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isFormBody
      ? (body as BodyInit)
      : body &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())
        ? typeof body === "string"
          ? body
          : JSON.stringify(body)
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

  // 1. Schema-based validation (Priority 1)
  if (schema) {
    try {
      return schema.parse(json);
    } catch {
      return await handleBadResponse(resp, {
        method,
        json,
        idempotencyKey,
      });
    }
  }

  // 2. No schema provided — unsafe cast (Discouraged)
  return json as T;
}
