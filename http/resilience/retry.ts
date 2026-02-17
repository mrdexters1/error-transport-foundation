import { FetchError } from "../../errors/transport/fetch-error";
import { TimeoutError } from "../../errors/transport/resilience-errors";

type BackoffStrategy = "fixed" | "exponential" | "linear";

export type RetryContext = {
  error: unknown;
  attempt: number;
  nextDelayMs: number;
  totalElapsedMs: number;
};

export type RetryExhaustedContext = {
  error: unknown;
  totalAttempts: number;
  totalElapsedMs: number;
};

export type RetryOptions = {
  /** Maximum number of attempts (including first). Default: 3 */
  maxAttempts?: number;
  /** Base delay between retries in ms. Default: 1000 */
  delayMs?: number;
  /** Backoff strategy. Default: "exponential" */
  backoff?: BackoffStrategy;
  /** Maximum random jitter added to delay in ms. Default: 100 */
  maxJitterMs?: number;
  /** Maximum delay cap in ms. Default: 30000 (30s) */
  maxDelayMs?: number;
  /** Custom retry predicate. Default: retry on 5xx and timeouts */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Called before each retry */
  onRetry?: (context: RetryContext) => void;
  /** Called when all retries are exhausted */
  onExhausted?: (context: RetryExhaustedContext) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateDelay = (
  attempt: number,
  baseDelay: number,
  strategy: BackoffStrategy,
  maxJitter: number,
  maxDelay: number,
): number => {
  let delay: number;

  switch (strategy) {
    case "exponential":
      delay = baseDelay * 2 ** (attempt - 1);
      break;
    case "linear":
      delay = baseDelay * attempt;
      break;
    case "fixed":
    default:
      delay = baseDelay;
  }

  // Add jitter to prevent thundering herd
  if (maxJitter > 0) {
    delay += Math.floor(Math.random() * maxJitter);
  }

  // Cap to maxDelay
  return Math.min(delay, maxDelay);
};

const defaultShouldRetry = (err: unknown): boolean => {
  // Retry on timeouts
  if (TimeoutError.is(err)) return true;
  // Retry on 5xx errors
  if (FetchError.is(err)) return err.status >= 500;
  // Don't retry on other errors (4xx, validation, etc.)
  return false;
};

type AsyncFn<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Wraps an async function with retry logic.
 *
 * Features:
 * - Exponential/linear/fixed backoff
 * - Jitter to prevent thundering herd
 * - Delay cap to prevent unbounded waits
 * - Metrics hooks (onRetry, onExhausted)
 *
 * @example
 * const fetchWithRetry = withRetry({
 *   maxAttempts: 3,
 *   backoff: "exponential",
 *   onRetry: ({ attempt, nextDelayMs }) => console.log(`Retry #${attempt}`)
 * })(fetchJSON);
 */
export const withRetry =
  (options: RetryOptions = {}) =>
  <TArgs extends unknown[], TResult>(
    fn: AsyncFn<TArgs, TResult>,
  ): AsyncFn<TArgs, TResult> =>
  async (...args) => {
    const {
      maxAttempts = 3,
      delayMs = 1000,
      backoff = "exponential",
      maxJitterMs = 100,
      maxDelayMs = 30_000,
      shouldRetry = defaultShouldRetry,
      onRetry,
      onExhausted,
    } = options;

    let lastError: unknown;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastError = err;
        const totalElapsedMs = Date.now() - startTime;
        const isLastAttempt = attempt === maxAttempts;

        if (isLastAttempt) {
          onExhausted?.({ error: err, totalAttempts: attempt, totalElapsedMs });
          throw err;
        }

        if (!shouldRetry(err, attempt)) {
          throw err;
        }

        const nextDelayMs = calculateDelay(
          attempt,
          delayMs,
          backoff,
          maxJitterMs,
          maxDelayMs,
        );

        onRetry?.({ error: err, attempt, nextDelayMs, totalElapsedMs });

        await sleep(nextDelayMs);
      }
    }

    throw lastError;
  };
