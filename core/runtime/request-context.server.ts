import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
};

/**
 * Server-side implementation of RequestContext using AsyncLocalStorage.
 */
const storage = new AsyncLocalStorage<RequestContext>();

export const requestContext = {
  run<T>(context: RequestContext, fn: () => T): T {
    return storage.run(context, fn);
  },

  get(): RequestContext | undefined {
    return storage.getStore();
  },

  getRequestId(): string | undefined {
    return this.get()?.requestId;
  },
};
