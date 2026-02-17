export type RequestContext = {
  requestId: string;
};

/**
 * Common entry point for RequestContext.
 * By default, it's a safe no-op.
 * Explicitly import from ./request-context.server for ALS support on Node.js.
 */
export const requestContext = {
  run<T>(_context: RequestContext, fn: () => T): T {
    return fn();
  },

  get(): RequestContext | undefined {
    return undefined;
  },

  getRequestId(): string | undefined {
    return undefined;
  },
};
