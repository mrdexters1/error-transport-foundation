# Next.js Integration

## withErrorHandler

Wraps Route Handlers (App Router). Catches errors, runs processing pipeline, returns `ApiErrorResponse`.

```ts
import { withErrorHandler } from "@/foundation/next";
import { NextResponse } from "next/server";
import { NotFoundError } from "@/foundation";

export const GET = withErrorHandler(async (req) => {
  const user = await getUserById("123");

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return NextResponse.json(user);
});
```

On error, returns:

```json
{
  "apiVersion": "1.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "code": "NOT_FOUND",
  "status": 404,
  "message": "User not found",
  "requestId": "abc-123",
  "retryable": false,
  "layer": "domain"
}
```

## withActionHandler

Wraps Server Actions. Returns `ActionResponse<T>` instead of throwing. Prevents Server Actions from throwing into React boundary.

```ts
import { withActionHandler } from "@/foundation/next";
import { ValidationError } from "@/foundation";

export const createUser = withActionHandler(async (data: CreateUserInput) => {
  const parsed = userSchema.safeParse(data);

  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten().fieldErrors);
  }

  const user = await db.insert(users).values(parsed.data).returning();
  return user;
});
```

Returns on success:

```ts
{ success: true, data: { id: "123", name: "John" } }
```

Returns on error:

```ts
{
  success: false,
  error: {
    apiVersion: "1.0",
    timestamp: "2024-01-15T10:30:00.000Z",
    code: "VALIDATION_ERROR",
    status: 422,
    message: "Invalid email",
    requestId: "abc-123",
    retryable: false,
    layer: "domain",
    meta: { type: "VALIDATION", fields: { email: "Invalid email" } }
  }
}
```

## Error Flow

```
classify → policy → map → log → respond
```

Processing (`classify → policy → map`) is pure.
Logging and response formatting happen in the adapter.

## Initialization

`initializeFoundationServer()` is required when using request tracing or `AsyncLocalStorage`. Required only in server runtime.

```ts
import { initializeFoundationServer } from "@/foundation/server";

// Call once at server startup
initializeFoundationServer();
```

## Type Definitions

```ts
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorResponse };

type ApiErrorResponse = {
  apiVersion: "1.0";
  timestamp: string;
  code: string;
  message: string;
  status: number;
  requestId?: string;
  retryable?: boolean;
  layer?: string;
  meta?: ApiErrorMeta;
};
```
