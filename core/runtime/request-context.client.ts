export type RequestContext = {
  requestId: string;
};

/**
 * Client-side mock of RequestContext.
 * Methods are no-ops or return undefined to stay safe in the browser.
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
