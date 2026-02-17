# Client Usage

Foundation provides three HTTP clients for different use cases.

## fetchJSON

Generic HTTP client for external APIs. Use for external APIs where you own error handling logic.

```ts
import { fetchJSON } from "@/foundation";

// Basic GET
const data = await fetchJSON({
  url: "https://api.openai.com/v1/models",
  method: "GET",
  authToken: process.env.OPENAI_API_KEY,
});

// POST with body
const result = await fetchJSON({
  url: "https://api.stripe.com/v1/charges",
  method: "POST",
  authToken: process.env.STRIPE_SECRET,
  body: { amount: 1000, currency: "usd" },
});

// With type guard validation
interface User { id: string; name: string }

const user = await fetchJSON<User>({
  url: "https://api.example.com/user/1",
  method: "GET",
  response: (data): data is User =>
    typeof data === "object" && data !== null && "id" in data,
});
```

Error behavior:
- Throws `FetchError` for non-2xx HTTP responses
- Throws `NetworkError` for connection failures
- Throws `TimeoutError` if request exceeds configured timeout

## fetchInternal

Designed for calling internal `/api` routes within the same application. Automatically handles structured `ApiErrorResponse` and preserves request tracing.

```ts
import { fetchInternal } from "@/foundation";

// Calls /api/v1/users
const users = await fetchInternal({
  url: "/v1/users",
  method: "GET",
});

// POST to internal API
await fetchInternal({
  url: "/v1/jobs/save",
  method: "POST",
  body: { jobId: "123" },
});
```

Throws `ApiResponseError` when server returns structured error.

## fetchGraphQL

For GraphQL endpoints. Extracts `data` and throws on GraphQL errors.

```ts
import { fetchGraphQL } from "@/foundation";

const profile = await fetchGraphQL<{ user: { name: string } }>({
  url: "https://api.upwork.com/graphql",
  query: `
    query GetUser($id: ID!) {
      user(id: $id) { name }
    }
  `,
  variables: { id: "123" },
  authToken: accessToken,
});

console.log(profile.user.name);
```

Throws `GraphQLUpstreamError` when response contains GraphQL errors. Network and HTTP errors are still thrown as `FetchError` / `NetworkError`.

## Mode: Proxy vs Integration

`fetchInternal` supports two modes:

```ts
// Integration mode (default) — we own the contract
await fetchInternal({ url: "/v1/users", method: "GET" });

// Proxy mode — forwarding upstream responses to user
await fetchInternal({ url: "/v1/users", method: "GET", mode: "proxy" });
```

Use integration mode when calling internal services as dependencies.
Use proxy mode when forwarding responses to the client.

See [proxy-vs-integration.md](./proxy-vs-integration.md) for details.

## Request Tracing

All clients automatically propagate `x-request-id` header when `initializeFoundationServer()` is called. Request ID is stored via `AsyncLocalStorage` in server runtime.

```ts
// Explicit requestId
await fetchJSON({
  url: "https://api.example.com",
  method: "GET",
  requestId: "custom-trace-id",
});
```

## Idempotency Keys

For safe retries of mutations. Useful when retry is enabled.

```ts
await fetchJSON({
  url: "https://api.stripe.com/v1/charges",
  method: "POST",
  body: { amount: 1000 },
  idempotencyKey: "charge_abc123",
});
```
