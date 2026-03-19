/**
 * Server Entry Point
 *
 * Server-only utilities. No side effects. No auto-init.
 *
 * Usage:
 * ```ts
 * import { initializeFoundationServer, getRequestContext } from '@/foundation/server';
 * ```
 */

import { setFetchRequestIdResolver } from "./client/fetch-json";
import { requestContext } from "./core/runtime/request-context.server";

/**
 * Initializes server-side foundation features.
 * Configure request tracing for fetchJSON.
 * Logger is now auto-initialized via request-context.server.
 */
export const initializeFoundationServer = (): void => {
  setFetchRequestIdResolver(() => requestContext.getRequestId());
};

/**
 * Get current request context (requestId, etc.)
 */
export const getRequestContext = () => requestContext;
