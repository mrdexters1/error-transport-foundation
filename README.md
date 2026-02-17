# Foundation

Reusable error handling and HTTP client layer for Next.js and Node-based projects.

Foundation standardizes:

- Error modeling
- Error classification
- HTTP status mapping
- API error responses
- Upstream client behavior

It is designed to be copied between projects or extracted into a shared package.

## Status

Early release (0.x).  
Public API may evolve before 1.0.0.

## Purpose

Provide a predictable and reusable infrastructure layer for:

- API routes
- Server Actions
- Upstream integrations
- Proxy endpoints

The goal is consistent error handling across all projects.

## What It Includes

- Structured error hierarchy (Domain, Transport, Infrastructure, Unexpected)
- Pure error processing pipeline
- Universal fetch client
- Thin Next.js adapters
- Optional resilience layer (timeout, retry, circuit breaker)
- Framework-independent core

## Basic Usage

### API Route

```ts
import { withErrorHandler } from "@/foundation/next";

export const GET = withErrorHandler(async () => {
  return { success: true };
});
```

### Server Action

```ts
import { withActionHandler } from "@/foundation/next";

export const submit = withActionHandler(async () => {
  return { ok: true };
});
```

### Upstream Request

```ts
import { fetchJSON } from "@/foundation";

const data = await fetchJSON("/external-api", {
  mode: "integration", // or "proxy"
});
```

## Design Principles

- Never throw plain objects.
- Transport reports facts, policy defines meaning.
- Domain does not know about HTTP.
- Proxy and integration behaviors are explicit.
- Core is framework-independent.

## Entry Points

Use:

- `@/foundation` — core logic and client
- `@/foundation/next` — Next.js adapters
- `@/foundation/server` — server utilities

## Documentation

See [`docs/`](docs/) for detailed guides:

- [Architecture](docs/architecture.md)
- [Error Model](docs/error-model.md)
- [Processing Pipeline](docs/processing-pipeline.md)
- [Client Usage](docs/client-usage.md)
- [Next.js Integration](docs/next-integration.md)
- [Proxy vs Integration](docs/proxy-vs-integration.md)
- [Guards and Validation](docs/guards-and-validation.md)
- [Resilience](docs/resilience.md)
- [Observability](docs/observability.md) (Sentry, logging, reporting)

---

This layer is intentionally minimal, predictable, and reusable across projects.
Keep it generic. Avoid project-specific logic inside Foundation.
