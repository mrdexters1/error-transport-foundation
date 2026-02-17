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
import { setRequestIdResolver } from "./core/logger/logger";
import { requestContext } from "./core/runtime/request-context.server";

/**
 * Initializes server-side foundation features:
 * - Configures request tracing for the logger
 * - Configures request tracing for fetchJSON
 *
 * Must be called once during server bootstrap.
 */
export const initializeFoundationServer = (): void => {
  setRequestIdResolver(() => requestContext.getRequestId());
  setFetchRequestIdResolver(() => requestContext.getRequestId());
};

/**
 * Get current request context (requestId, etc.)
 */
export const getRequestContext = () => requestContext;
