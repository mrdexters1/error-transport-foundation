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
│   ├── infrastructure/   # External system errors (formally infrastructure)
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
http/resilience
  ↑
client/
  ↑
adapters/next
```

Key rules:
- `core/` has no dependencies on other foundation modules.
- `client/` uses `errors/infrastructure` for external failure types.
- `errors/processing` is framework-independent and pure.
- `http/resilience` provides composable wrappers for HTTP clients.
- `adapters/` is the only layer with side effects (logging, I/O).


## Why Processing Is Pure

The error processing pipeline (`classify → policy → map → response`) is pure:

- No side effects
- No I/O
- Fully testable

See [Processing Pipeline](./processing-pipeline.md) for a detailed breakdown.

Side effects (logging, reporting) are handled by the adapter after the pipeline completes.

---

Processing must remain framework-independent.
Do not add Next.js, logging, I/O, or project-specific logic to this layer.
