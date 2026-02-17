# Error Model

## Hierarchy

```
BaseError (abstract)
├── DomainError
├── InfrastructureError
└── ApplicationError
    └── UnexpectedError
```

## BaseError

All errors extend `BaseError`. Required properties:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Unique error code (SCREAMING_SNAKE_CASE) |
| `layer` | `"domain" \| "infrastructure" \| "application"` | Origin layer |
| `retryable` | `boolean` | Can operation be retried? |
| `operational` | `boolean` | `true` = expected runtime condition, `false` = programmer bug |
| `cause` | `unknown` | Original error for debugging |

## DomainError

Business rule violations. Always operational, never retryable.

Domain errors should never represent system failures.

```ts
import { NotFoundError, ForbiddenError, ValidationError } from "@/foundation";

throw new NotFoundError("User not found");
throw new ForbiddenError("Cannot delete other users");
throw new ValidationError({ email: "Invalid email format" });
```

Available domain errors:
- `NotFoundError` — resource missing
- `UnauthorizedError` — not logged in
- `ForbiddenError` — no permission
- `ConflictError` — duplicate / conflict
- `ValidationError` — invalid input (with field map)
- `InvalidParamError` — invalid URL/query param

## InfrastructureError

External system failures. Operational (system detected and handled external failure correctly), retryable depends on error type.

```ts
import { FetchError, NetworkError, TimeoutError } from "@/foundation";

throw new FetchError({
  method: "POST",
  url: "https://api.stripe.com/...",
  status: 502,
  statusText: "Bad Gateway",
});

throw new NetworkError("Connection refused");
throw new TimeoutError(5000);
```

Available infrastructure errors:
- `FetchError` — HTTP error (status, body included)
- `NetworkError` — connection failure
- `TimeoutError` — request timed out
- `CircuitOpenError` — circuit breaker open
- `ApiResponseError` — internal API returned error
- `GraphQLUpstreamError` — GraphQL-level error

## ApplicationError

Programmer errors. Non-operational (triggers alerts). Should not happen during normal execution. Indicates a programming bug or invalid application state.

```ts
import { UnexpectedError } from "@/foundation";

throw new UnexpectedError({ cause: originalError });
```

## ApiResponseError

Wraps errors from internal API calls. Used only when calling internal APIs via `fetchInternal`. Should not be thrown manually.

```ts
import { ApiResponseError } from "@/foundation";

try {
  await fetchInternal({ url: "/v1/users", method: "POST", body: data });
} catch (err) {
  if (ApiResponseError.is(err)) {
    console.log(err.status);       // 422
    console.log(err.remoteError);  // ApiErrorResponse from server
    console.log(err.mode);         // "proxy" | "integration"
  }
}
```

## When to Use Each

| Situation | Error Type |
|-----------|-----------|
| User not found | `NotFoundError` |
| Invalid form data | `ValidationError` |
| External API down | `FetchError` / `NetworkError` |
| External timeout | `TimeoutError` |
| Internal API error | `ApiResponseError` |
| Unhandled exception / programmer bug | `UnexpectedError` |
