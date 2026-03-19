# Processing Pipeline

The error processing pipeline is the heart of Foundation. It transforms any error (caught by an adapter or thrown manually) into a structured `ApiErrorResponse` via a series of pure transformations.

## The Flow

The pipeline involves four main stages:

```
1. classifyError(err) → BaseError
2. getErrorPolicy(baseError) → ErrorPolicy
3. mapToHttpError(baseError, policy) → HttpError
4. toApiErrorResponse(httpError, requestId) → ApiErrorResponse
```

### 1. Classification (`classifyError`)

Normalizes various error types (Plain `Error`, `ZodError`, manual `BaseError` instance) into a common `BaseError` interface.

- **Inputs:** `unknown` error.
- **Output:** An object extending `BaseError` (e.g., `DomainError`, `InfrastructureError`).
- **Logic:** Identifies if error is already a `BaseError` or needs wrapping (e.g., a standard `Error` becomes an `UnexpectedError`).

### 2. Policy (`getErrorPolicy`)

Determines how the error should be handled by the system.

- **Inputs:** `BaseError`.
- **Output:** `ErrorPolicy` object.

```ts
type ErrorPolicy = {
  shouldReport: boolean;  // Send to Sentry (e.g. Infrastructure, Application errors)
  shouldAlert: boolean;   // Trigger real-time alerts (e.g. 500 errors)
  shouldExpose: boolean;  // Show details to end user? (e.g. 4xx vs 5xx)
  logLevel: "error" | "warn" | "info";
};
```

### 3. Mapping (`mapToHttpError`)

Translates the normalized `BaseError` and its `Policy` into a specific HTTP status code and message.

- **Inputs:** `BaseError`, `ErrorPolicy`.
- **Output:** `HttpError` (contains status code, message, and metadata).
- **Rule:** If `shouldExpose` is false, it uses a generic system error message.

### 4. Response (`toApiErrorResponse`)

Converts the `HttpError` into the final JSON structure sent to the client.

- **Inputs:** `HttpError`, `requestId`.
- **Output:** `ApiErrorResponse`.

## Key Principles

### Purity

The pipeline is **pure**. It does not call `console.log`, does not send metrics to Sentry, and does not perform I/O. This makes it:
- Easy to test in isolation.
- Fast (no side effects).
- Reusable across different environments (Next.js, Express, Edge).

### Side Effects are Handled by Adapters

Side effects (logging and reporting) happen in the adapter layer (e.g., `withErrorHandler` in Next.js) *after* the pipeline has determined what should happen.

```ts
// Example: Next.js withErrorHandler logic
try {
  const result = await handler(req);
} catch (err) {
  const baseError = classifyError(err);
  const policy = getErrorPolicy(baseError);
  const httpError = mapToHttpError(baseError, policy);
  const response = toApiErrorResponse(httpError, requestId);

  // Side effects happen HERE, guided by the policy
  if (policy.logLevel === 'error') logger.error(err, { requestId });
  if (policy.shouldReport) reportToSentry(err, policy);

  return NextResponse.json(response, { status: httpError.status });
}
```

## Related Documents

- [Error Model](./error-model.md) — The types of errors categorized in classification.
- [Observability](./observability.md) — How side effects are implemented.
- [Next.js Integration](./next-integration.md) — Where the pipeline is called in Next.js.
