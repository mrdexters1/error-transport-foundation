# Changelog

## [0.0.2] - 2026-03-19

### Changed
- **Deep Architecture Simplification**: 
  - Automated `requestId` tracing for `logger` and `fetchJSON`. Tracing is now transparent and doesn't require manual initialization on the server.
  - Simplified public API in `foundation/next` to improve developer experience (DX).
  - Merged shutdown signal registration into a single automated flow.
  - **Contract Safety**: Added optional `schema` validation to `fetchJSON` (compatible with Zod). This prevents runtime failures in UI due to backend contract changes.
  - **Security**: Implemented **SSRF Safeguards** in `fetchJSON`. Protects server-side requests by blocking private IP ranges, cloud metadata endpoints, and restricted protocols by default.

### Added
- `autoShutdown` helper in `foundation/next` for easy one-liner resource cleanup (e.g. database, redis).

### Removed
- `initFoundation()` and `ensureFoundationInitialized()` functions as they are no longer required due to automation.
- `adapters/next/init.ts` file.

## [0.1.0] - 2026-02-17

Initial public release.

### Added

- Structured error model (Domain, Infrastructure, Application)
- Pure error processing pipeline
- HTTP clients (fetchJSON, fetchInternal, fetchGraphQL)
- Proxy vs Integration mode
- Resilience wrappers (timeout, retry, circuit breaker)
- Next.js adapters (Route Handlers, Server Actions)
- Structured logger with request tracing
- Type guards and validation utilities
- Complete documentation

---
