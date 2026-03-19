# Client Usage

Foundation provides three HTTP clients for different use cases. This guide explains how to use each client and their specific features.

---

## 1. fetchJSON (External APIs)

Generic HTTP client for external APIs. Use for external APIs where you own error handling logic.

### Basic GET & POST

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
```

### Schema Validation (Recommended)

Always validate external data at the boundary using schema libraries like Zod.

```ts
import { fetchJSON } from "@/foundation";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const user = await fetchJSON({
  url: "https://api.example.com/user/1",
  method: "GET",
  schema: UserSchema,
});
```

### Idempotency Keys

For safe retries of mutations. Useful when retry resilience is enabled to prevent duplicate actions.

```ts
await fetchJSON({
  url: "https://api.stripe.com/v1/charges",
  method: "POST",
  body: { amount: 1000 },
  idempotencyKey: "charge_abc123",
});
```

### Security: SSRF Safeguards

In server environments, `fetchJSON` includes built-in safeguards against Server-Side Request Forgery. By default, it blocks restricted protocols, private IP ranges, and cloud metadata endpoints.

To allow internal requests, configure the `ssrf` options:

```ts
await fetchJSON({
  url: "http://internal-service.local/data",
  method: "GET",
  ssrf: {
    allowList: ["internal-service.local"],
    blockPrivateIPs: false, // Use only for trusted internal networks
  }
});
```

**Error behavior for `fetchJSON`:**
- Throws `FetchError` for non-2xx HTTP responses
- Throws `NetworkError` for connection failures
- Throws `TimeoutError` if request exceeds configured timeout

---

## 2. fetchInternal (Internal APIs)

Designed for calling internal `/api` routes within the same application. Automatically handles structured `ApiErrorResponse` and preserves request tracing.

**Error behavior:** Throws `ApiResponseError` when server returns structured error.

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

### Proxy vs Integration Mode

Mode affects how upstream errors are interpreted by the policy layer. Mode is defined per call and affects error interpretation only, not infrastructure behavior.

#### Integration Mode (Default)
We own the contract. Errors indicate bugs. Use when calling internal services as dependencies.

```ts
await fetchInternal({ url: "/v1/users", method: "POST", body: data });
// mode: "integration" (implicit)
```
- 4xx typically indicates a contract violation (our bug)
- 5xx = infrastructure failure (backend unavailable or crashed)
- `shouldReport: true`, `shouldExpose: false` (hide details from user)

#### Proxy Mode
We're passing user input through. Errors are expected. Use when forwarding responses to the client (e.g. in a pass-through API route).

```ts
await fetchInternal({
  url: "/v1/users",
  method: "POST",
  body: userInput,
  mode: "proxy"
});
```
- 4xx = **expected** (user sent bad data)
- 5xx = infrastructure failure (log as error)
- `shouldReport: false`, `shouldExpose: true` (show message to user)

#### Policy Comparison

| Aspect | Integration | Proxy |
|--------|-------------|-------|
| 4xx meaning | Contract violation | User error |
| shouldReport | `true` | `false` |
| shouldExpose | `false` | `true` |
| logLevel (4xx) | `error` | `info` |
| logLevel (5xx) | `error` | `error` |

---

## 3. fetchGraphQL (GraphQL APIs)

For GraphQL endpoints. Extracts `data` and throws on GraphQL errors.

**Error behavior:** Throws `GraphQLUpstreamError` when response contains GraphQL errors. Network and HTTP errors are still thrown as `FetchError` / `NetworkError`.

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

---

## 4. Global Features (All Clients)

### Request Tracing (`x-request-id`)

All clients automatically propagate the `x-request-id` header when running in a supported server runtime (e.g. Next.js). Request ID is stored via `AsyncLocalStorage` and handled automatically by Foundation.

You can also explicitly override it per request:

```ts
// Explicit requestId
await fetchJSON({
  url: "https://api.example.com",
  method: "GET",
  requestId: "custom-trace-id",
});
```
