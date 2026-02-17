# Architecture

## Folder Structure

```
foundation/
├── index.ts              # Main entry (isomorphic)
├── next.ts               # Next.js adapters
├── server.ts             # Server-only utilities
├── core/                 # Framework-agnostic utilities
│   ├── logger/           # Structured logging
│   ├── runtime/          # Request context (AsyncLocalStorage)
│   ├── utils/            # Guards, string utils
│   └── validation/       # asType validators
├── errors/
│   ├── core/             # BaseError, error codes
│   ├── domain/           # Business logic errors
│   ├── transport/        # HTTP/network errors
│   ├── processing/       # classify → policy → map → response
│   └── unexpected/       # Catch-all for unknown errors
├── client/               # HTTP clients (fetchJSON, fetchInternal, fetchGraphQL)
├── http/
│   └── resilience/       # timeout, retry, circuit breaker
├── adapters/
│   └── next/             # withErrorHandler, withActionHandler
└── params/               # URL param validators
```

## Dependency Direction

```
core/
  ↑
errors/*
  ↑
client/
  ↑
adapters/next
```

Key rules:
- `core/` has no dependencies on other foundation modules
- `client/` uses `errors/transport` for error types
- `errors/processing` does not depend on `adapters/`
- `adapters/` is the only layer with side effects (logging, I/O)
- `errors/*` includes core, domain, transport, processing, and unexpected layers.


## Why Processing Is Pure

The error processing pipeline (`classify → policy → map → response`) is pure:

- No side effects
- No I/O
- Fully testable

```ts
const baseError = classifyError(err);
const policy = getErrorPolicy(baseError);
const httpError = mapToHttpError(baseError, policy);
const response = toApiErrorResponse(httpError, requestId);
```

Side effects (logging, reporting) are handled by the adapter after the pipeline completes.

---

Processing must remain framework-independent.
Do not add Next.js, logging, I/O, or project-specific logic to this layer.
