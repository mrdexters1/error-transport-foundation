# Changelog

## [0.0.3] - 2026-03-19

### Changed
- **Terminology Unification**: Renamed `errors/transport` directory to `errors/infrastructure` to match the core error model and unified terminology across all documents.
- **Documentation Overhaul**: 
  - Filled `docs/processing-pipeline.md` with a detailed architecture overview (previously empty).
  - Renamed `docs/ui_error_handling.md` to `docs/ui-error-handling.md` (kebab-case) for naming consistency.
  - Enriched root `README.md` with descriptive summaries for all documentation links.
  - Removed redundant `docs/README.md` index to maintain a single source of truth in the root.
  - Updated `docs/architecture.md` to include the `http/resilience` layer and unified category naming.
- **Improved Code Consistency**: Updated all internal imports and code references from `transport` to `infrastructure` globally.
- **Observability**: Refined error policy definitions and clarified the relationship between `ValidationError` and `DomainError` in `observability.md`.

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
