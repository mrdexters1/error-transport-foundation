# Observability

Foundation separates error classification from logging and reporting.

## Logger

Structured logger with automatic request tracing. Logger always emits structured JSON logs.

```ts
import { logger } from "@/foundation";

logger.info("User created", { userId: "123" });
logger.warn("Rate limit approaching", { remaining: 10 });
logger.error(error, { code: "SAVE_FAILED", userId: "123" });
```

Output (JSON):

```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "abc-123",
  "code": "SAVE_FAILED",
  "context": { "userId": "123" }
}
```

## Log Levels

Default policy determines log level based on error type:

| Error Type | Log Level | Note |
|------------|-----------|------|
| ValidationError | `info` | User input error (a specialized DomainError) |
| DomainError | `warn` | Business rule violation |
| InfrastructureError | `error` | External system failure (formally Infrastructure) |
| ApplicationError | `error` | Programmer bug |
| UnexpectedError | `error` | Catch-all for unknown errors |
| ApiResponseError (proxy, 4xx) | `info` | Forwarded user error |
| ApiResponseError (integration) | `error` | Internal service contract failure |

## Custom Provider

Replace default console output. Provider should be configured once during application bootstrap.

```ts
import { logger } from "@/foundation";

logger.setProvider({
  debug: (data) => myLogger.debug(data),
  info: (data) => myLogger.info(data),
  warn: (data) => myLogger.warn(data),
  error: (data) => myLogger.error(data),
});
```

## Sentry Integration

```ts
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/foundation";

logger.setProvider({
  error: (data) => {
    structuredLogger.error(data);

    if (data.originalError instanceof Error) {
      Sentry.captureException(data.originalError, {
        tags: {
          code: data.code,
          layer: data.layer,
        },
        extra: {
          requestId: data.requestId,
          context: data.context,
        },
      });
    }
  },
  warn: (data) => structuredLogger.warn(data),
  info: (data) => structuredLogger.info(data),
});
```

## Policy Fields

The error policy controls what gets logged and reported:

```ts
type ErrorPolicy = {
  shouldReport: boolean;  // Send to error tracking?
  shouldAlert: boolean;   // Trigger PagerDuty/alert?
  shouldExpose: boolean;  // Show message to user?
  logLevel: "error" | "warn" | "info";
};
```

Use in Sentry:

```ts
import { getErrorPolicy, classifyError } from "@/foundation";

const baseError = classifyError(error);
const policy = getErrorPolicy(baseError);

if (policy.shouldReport) {
  Sentry.captureException(baseError);
}

if (policy.shouldAlert) {
  await pagerduty.trigger({ ... });
}
```

## Request Tracing

Logger automatically includes `requestId` when running in a supported server runtime (e.g. Next.js). Tracing is handles automatically by Foundation using `AsyncLocalStorage`. No manual initialization required.

```ts
// Now all logs include requestId from AsyncLocalStorage automatically
logger.info("Processing request"); // { requestId: "abc-123", ... }
```
