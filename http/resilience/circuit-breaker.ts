import { CircuitOpenError } from "../../errors/transport/resilience-errors";
import {
  type CircuitData,
  type CircuitState,
  type CircuitStorage,
  DEFAULT_CIRCUIT,
  inMemoryStorage,
} from "./storage";

export type StateChangeContext = {
  name: string;
  from: CircuitState;
  to: CircuitState;
  failures: number;
};

export type FailureContext = {
  name: string;
  error: unknown;
  failures: number;
  state: CircuitState;
};

export type SuccessContext = {
  name: string;
  state: CircuitState;
  recoveryProgress?: { current: number; required: number };
};

export type CircuitBreakerOptions = {
  /** Number of failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Time in ms before transitioning from open to half-open. Default: 30000 */
  resetTimeout?: number;
  /** Number of successes in half-open before closing. Default: 2 */
  successThreshold?: number;
  /** Custom storage (default: in-memory via globalStorage) */
  storage?: CircuitStorage;
  /** Called when circuit state changes */
  onStateChange?: (context: StateChangeContext) => void;
  /** Called on each failure */
  onFailure?: (context: FailureContext) => void;
  /** Called on each success */
  onSuccess?: (context: SuccessContext) => void;
};

type AsyncFn<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Wraps an async function with circuit breaker pattern.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast with CircuitOpenError
 * - HALF-OPEN: Testing if service recovered, limited requests pass
 *
 * @example
 * const fetchWithCB = withCircuitBreaker("api-name", {
 *   failureThreshold: 5,
 *   resetTimeout: 60_000,
 *   onStateChange: ({ from, to }) => console.log(`Circuit: ${from} → ${to}`)
 * })(fetchJSON);
 */
export const withCircuitBreaker =
  (name: string, options: CircuitBreakerOptions = {}) =>
  <TArgs extends unknown[], TResult>(
    fn: AsyncFn<TArgs, TResult>,
  ): AsyncFn<TArgs, TResult> =>
  async (...args) => {
    const {
      failureThreshold = 5,
      resetTimeout = 30_000,
      successThreshold = 2,
      storage = inMemoryStorage,
      onStateChange,
      onFailure,
      onSuccess,
    } = options;

    // Get current circuit state
    const circuit: CircuitData = (await storage.get(name)) ?? {
      ...DEFAULT_CIRCUIT,
    };
    const now = Date.now();
    const prevState = circuit.state;

    // Check if circuit is open
    if (circuit.state === "open") {
      const resetAt = circuit.lastFailure + resetTimeout;

      if (now >= resetAt) {
        // Transition to half-open
        circuit.state = "half-open";
        circuit.successes = 0;
        await storage.set(name, circuit);

        if (prevState !== circuit.state) {
          onStateChange?.({
            name,
            from: prevState,
            to: circuit.state,
            failures: circuit.failures,
          });
        }
      } else {
        // Still open, fail fast
        throw new CircuitOpenError(name, resetAt);
      }
    }

    try {
      const result = await fn(...args);
      const postCallState = circuit.state;

      // Handle success
      if (circuit.state === "half-open") {
        circuit.successes++;
        if (circuit.successes >= successThreshold) {
          circuit.state = "closed";
          circuit.failures = 0;
        }
      } else {
        // Reset failure count on success in closed state
        circuit.failures = 0;
      }

      await storage.set(name, circuit);

      if (postCallState !== circuit.state) {
        onStateChange?.({
          name,
          from: postCallState,
          to: circuit.state,
          failures: circuit.failures,
        });
      }

      onSuccess?.({
        name,
        state: circuit.state,
        recoveryProgress:
          postCallState === "half-open"
            ? { current: circuit.successes, required: successThreshold }
            : undefined,
      });

      return result;
    } catch (err) {
      const postCallState = circuit.state;

      // Handle failure
      circuit.failures++;
      circuit.lastFailure = now;

      if (circuit.failures >= failureThreshold) {
        circuit.state = "open";
      }

      await storage.set(name, circuit);

      if (postCallState !== circuit.state) {
        onStateChange?.({
          name,
          from: postCallState,
          to: circuit.state,
          failures: circuit.failures,
        });
      }

      onFailure?.({
        name,
        error: err,
        failures: circuit.failures,
        state: circuit.state,
      });

      throw err;
    }
  };
