# Resilience

Optional composable wrappers for fault tolerance around HTTP clients.

Resilience wrappers do not change error classification. They only affect execution behavior.

## withTimeout

Cancels request after specified duration.

```ts
import { withTimeout } from "@/foundation/http/resilience";
import { fetchJSON } from "@/foundation";

const fetchWithTimeout = withTimeout(5000)(fetchJSON);

await fetchWithTimeout({
  url: "https://api.slow-service.com",
  method: "GET",
});
// Throws TimeoutError after 5 seconds
```

## withRetry

Retries failed requests with backoff.

```ts
import { withRetry } from "@/foundation/http/resilience";
import { fetchJSON } from "@/foundation";

const fetchWithRetry = withRetry({
  maxAttempts: 3,
  delayMs: 1000,
  backoff: "exponential",  // 1s, 2s, 4s
  onRetry: ({ attempt }) => console.log(`Retry #${attempt}`),
})(fetchJSON);

await fetchWithRetry({ url: "...", method: "GET" });
```

Options:
- `maxAttempts` — total attempts (default: 3)
- `delayMs` — base delay (default: 1000)
- `backoff` — `"fixed"` | `"linear"` | `"exponential"`
- `maxJitterMs` — random jitter to prevent thundering herd
- `shouldRetry` — custom predicate (default retries only on retryable infrastructure errors)

## withCircuitBreaker

Fails fast when service is down.

```ts
import { withCircuitBreaker } from "@/foundation/http/resilience";
import { fetchJSON } from "@/foundation";

const fetchWithCB = withCircuitBreaker("stripe-api", {
  failureThreshold: 5,
  resetTimeout: 30_000,
  successThreshold: 2,
  onStateChange: ({ from, to }) => console.log(`Circuit: ${from} → ${to}`),
})(fetchJSON);
```

States:
- **CLOSED** — normal operation
- **OPEN** — fail fast with `CircuitOpenError`
- **HALF-OPEN** — testing if service recovered

## Composition

Combine wrappers for full resilience:

```ts
import { withTimeout, withRetry, withCircuitBreaker } from "@/foundation/http/resilience";
import { fetchJSON } from "@/foundation";

const resilientFetch = withCircuitBreaker("external-api")(
  withRetry({ maxAttempts: 3 })(
    withTimeout(5000)(fetchJSON)
  )
);

await resilientFetch({ url: "...", method: "GET" });
```

Recommended order (inside → outside): timeout → retry → circuit breaker. Circuit breaker should wrap the fully resilient client.

## Edge Runtime

Circuit breaker uses in-memory storage by default. In serverless environments, in-memory storage is per instance. Shared storage is required for consistent state across instances.

For Edge Runtime or multi-instance deployments, provide custom storage:

```ts
import { withCircuitBreaker } from "@/foundation/http/resilience";

const redisStorage: CircuitStorage = {
  get: (name) => redis.get(`circuit:${name}`),
  set: (name, data) => redis.set(`circuit:${name}`, data),
};

const fetch = withCircuitBreaker("api", { storage: redisStorage })(fetchJSON);
```

## When to Use

| Wrapper | Use Case |
|---------|----------|
| `withTimeout` | Prevent hanging requests |
| `withRetry` | Transient failures (network blips, 503) |
| `withCircuitBreaker` | Protect against cascading failures |
| All three combined | Critical external dependencies |
