import { TimeoutError } from "../../errors/transport/resilience-errors";

/**
 * Base type for fetch-like params that support AbortSignal via initParams.
 */
export type WithInitParams = {
  initParams?: Omit<RequestInit, "body" | "method" | "headers">;
};

/**
 * Combines multiple AbortSignals into one.
 * First abort from any signal aborts all.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }

  return controller.signal;
}

/**
 * Wraps a fetch-like function with a timeout using AbortController.
 * Actually cancels the underlying request (not just ignoring the result).
 *
 * Works with any function that accepts params with `initParams.signal`.
 *
 * @example
 * const fetchWithTimeout = withTimeout(5000)(fetchJSON);
 * await fetchWithTimeout({ url: "...", method: "GET" });
 */
export const withTimeout =
  (timeoutMs: number) =>
  <TParams extends WithInitParams, TResult>(
    fn: (params: TParams) => Promise<TResult>,
  ): ((params: TParams) => Promise<TResult>) =>
  (params) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge with existing signal (if any)
    const existingSignal = params.initParams?.signal;
    const signal = existingSignal
      ? anySignal([existingSignal, controller.signal])
      : controller.signal;

    return fn({
      ...params,
      initParams: {
        ...params.initParams,
        signal,
      },
    })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") {
          throw new TimeoutError(timeoutMs);
        }
        throw err;
      })
      .finally(() => clearTimeout(timeoutId));
  };
