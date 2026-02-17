# UI Error Handling

This document defines the client-side error normalization layer. For server-side error handling, see [error-model.md](./error-model.md) and [processing-pipeline.md](./processing-pipeline.md).

## Rationale

Server actions and API routes return structured errors (`ApiErrorResponse`). However, UI components should not inspect transport-level details (status codes, error codes, meta structures). This creates coupling between UI and transport layers.

The UI error layer provides:

1. **Single normalization point** — One function transforms any error into a predictable shape.
2. **Semantic classification** — UI logic operates on `ErrorKind`, not HTTP status codes.
3. **Deterministic form placement** — Clear rules for where errors appear in forms.
4. **Anti-Leak compliance** — UI never exposes internal details; `raw` is opt-in for logging only.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                  │
│  BaseError → classifyError → mapToHttpError → ApiErrorResponse  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        (network boundary)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│                                                                 │
│   unknown error                                                 │
│        ↓                                                        │
│   analyzeError(error) → UiError                                 │
│        ↓                                                        │
│   switch (ui.kind)                                              │
│        ├── AUTH        → redirect / root error                  │
│        ├── VALIDATION  → field errors / root error              │
│        ├── RATE_LIMIT  → countdown / retry UI                   │
│        ├── DEPENDENCY  → retry button / root error              │
│        ├── UNEXPECTED  → generic message / root error           │
│        └── DOMAIN      → fallback field / root error            │
└─────────────────────────────────────────────────────────────────┘
```

## Mandatory Usage Pattern

All UI error handling MUST follow this pattern:

```typescript
import { analyzeError, applyFormErrors, shouldRedirectToLogin } from "@/foundation/client";
import { redirect } from "next/navigation";
import { ROUTES } from "@/toolbox/constants/routes";

async function onSubmit(values: FormValues) {
  const result = await serverAction(values);

  if (!result.success) {
    const ui = analyzeError(result);

    // 1. Handle redirect cases first
    if (shouldRedirectToLogin(ui)) {
      redirect(ROUTES.LOGIN);
      return;
    }

    // 2. Apply to form
    applyFormErrors(ui, form);
    return;
  }

  // Success path
}
```

**Rules:**

- MUST normalize each error exactly once.
- MUST NOT call normalization multiple times on the same error.
- MUST NOT inspect `result.error` directly; always use the normalized `UiError`.
- MUST handle `AUTH` errors before applying to form (redirect or explicit skip).

## ErrorKind Reference

| Kind | Trigger | Default Placement | Typical UI Action |
|------|---------|-------------------|-------------------|
| `AUTH` | 401, `UNAUTHORIZED` | root | Redirect to login |
| `FORBIDDEN` | 403, `FORBIDDEN` | fallbackField or root | Show access denied |
| `NOT_FOUND` | 404, `NOT_FOUND` | fallbackField or root | Show not found |
| `VALIDATION` | `VALIDATION_ERROR` code | field errors or root | Highlight fields |
| `RATE_LIMIT` | 429, `RATE_LIMIT` meta | root | Show countdown |
| `DOMAIN` | Other 4xx | fallbackField or root | Show message |
| `DEPENDENCY` | 502-504, `infrastructure` layer | root | Show retry |
| `UNEXPECTED` | 500, `application` layer | root | Show generic error |

## Form Error Placement Rules

The `applyFormErrors()` function follows deterministic placement rules.

### ALWAYS_ROOT_KINDS

These error kinds ALWAYS go to root, regardless of `fallbackField`:

```typescript
const ALWAYS_ROOT_KINDS = new Set([
  "VALIDATION",  // Form-level validation (when no field errors)
  "AUTH",        // Authentication is not a field problem
  "DEPENDENCY",  // Server unavailable is not a field problem
  "RATE_LIMIT",  // Throttling is not a field problem
  "UNEXPECTED",  // System error is not a field problem
]);
```

**Note:** `VALIDATION` with field errors bypasses this rule — it is handled earlier in the decision tree and applies errors to specific form fields.

### Placement Decision Tree

```
1. Is kind VALIDATION with field errors?
   YES → Apply to form fields (with optional fieldMap)
   NO  → Continue

2. Is kind AUTH and applyAuthErrors === false?
   YES → Skip (return false)
   NO  → Continue

3. Is kind in ALWAYS_ROOT_KINDS?
   YES → Apply to root
   NO  → Continue

4. Apply to fallbackField (if provided) or root
```

### Field Mapping

When server field names differ from form field names:

```typescript
applyFormErrors(ui, form, {
  fieldMap: {
    email_address: "email",
    full_name: "name",
    phone_number: "phone",
  },
});
```

## Redirect Handling

```typescript
const ui = analyzeError(result);

if (shouldRedirectToLogin(ui)) {
  // Option 1: Hard redirect
  redirect(ROUTES.LOGIN);

  // Option 2: Store return URL
  const returnUrl = encodeURIComponent(window.location.pathname);
  redirect(`${ROUTES.LOGIN}?returnUrl=${returnUrl}`);
}
```

**Rule:** Always check `shouldRedirectToLogin()` BEFORE calling `applyFormErrors()`.

## Retry Handling

```typescript
const ui = analyzeError(result);

if (ui.retryable) {
  // Show retry UI
  return (
    <RetryableError
      message={ui.message}
      onRetry={() => refetch()}
    />
  );
}

// For rate limits with countdown
if (ui.kind === "RATE_LIMIT" && ui.rateLimitInfo?.retryAfter) {
  return (
    <RateLimitError
      retryAfter={ui.rateLimitInfo.retryAfter}
      onRetryReady={() => refetch()}
    />
  );
}
```

## Toast Pattern

Toast utilities live in the app layer, not foundation:

```typescript
// toolbox/utils/toast-error.ts
import { toast } from "sonner";
import { getErrorMessage } from "@/foundation/client";

export function toastError(error: unknown, fallback = "An error occurred"): void {
  toast.error(getErrorMessage(error, fallback));
}
```

**Usage:**

```typescript
import { toastError } from "@/toolbox/utils/toast-error";

try {
  await deleteJob(id);
} catch (error) {
  toastError(error, "Failed to delete job");
}
```

## Logging with Raw Error

For debugging and support tickets, include the raw error:

```typescript
import { analyzeError } from "@/foundation/client";
import { logger } from "@/foundation";

const ui = analyzeError(result, undefined, { includeRaw: true });

if (ui.kind === "UNEXPECTED") {
  logger.error(ui.raw, {
    layer: "ui",
    kind: ui.kind,
    requestId: ui.requestId,
  });
}
```

**Rules:**

- MUST NOT use `raw` in UI rendering.
- MUST NOT serialize `raw` to client state or localStorage.
- `raw` is for logging and debugging ONLY.

## Scroll to First Error

```typescript
import { getFirstFieldError } from "@/foundation/client";

function scrollToFirstError(form: UseFormReturn<any>) {
  const first = getFirstFieldError(form.formState.errors);
  if (first) {
    const element = document.querySelector(`[name="${first.path}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    (element as HTMLElement)?.focus();
  }
}
```

## Clearing Root Errors

Clear server errors when user starts typing:

```typescript
import { clearRootError } from "@/foundation/client";

<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormControl>
        <Input
          {...field}
          onChange={(e) => {
            field.onChange(e);
            clearRootError(form);
          }}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Forbidden Patterns

### Transport Inspection

```typescript
// FORBIDDEN: Inspecting status codes in UI
if (result.error?.status === 401) { ... }

// FORBIDDEN: Inspecting error codes in UI
if (result.error?.code === "UNAUTHORIZED") { ... }

// CORRECT: Use semantic kind
const ui = analyzeError(result);
if (ui.kind === "AUTH") { ... }
```

### Multiple Normalization

```typescript
// FORBIDDEN: Multiple normalization calls
const ui1 = analyzeError(result);
const ui2 = analyzeError(result); // Wasteful

// CORRECT: Single normalization
const ui = analyzeError(result);
// Reuse ui for all checks
```

### Manual setError

```typescript
// FORBIDDEN: Manual setError for server errors
if (!result.success) {
  form.setError("password", { message: result.error.message });
}

// CORRECT: Use applyFormErrors
if (!result.success) {
  const ui = analyzeError(result);
  applyFormErrors(ui, form, { fallbackField: "password" });
}
```

### Raw in UI

```typescript
// FORBIDDEN: Using raw in UI
<Text>{ui.raw?.meta?.fields?.email}</Text>

// CORRECT: Use normalized fields
{ui.validationFields?.email && <Text>{ui.validationFields.email}</Text>}
```

### Direct Meta Access

```typescript
// FORBIDDEN: Accessing meta directly
if (result.error?.meta?.type === "VALIDATION") { ... }

// CORRECT: Use type guard
const ui = analyzeError(result);
if (hasFieldErrors(ui)) { ... }
```

## Adding a New ErrorKind

When introducing a new `ErrorKind`:

1. Update `ErrorKind` type in `foundation/client/ui-error.ts`.
2. Update `determineKind()` classification logic.
3. Decide placement behavior (add to `ALWAYS_ROOT_KINDS` or allow `fallbackField`).
4. Update `ErrorKind Reference` table in this document.
5. Update `Forbidden Patterns` if the new kind requires special handling.

**Rule:** No new `ErrorKind` may be introduced without updating this documentation.

## Type Reference

```typescript
type ErrorKind =
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "DOMAIN"
  | "DEPENDENCY"
  | "UNEXPECTED";

type UiError = {
  code: string;
  status: number;
  message: string;
  kind: ErrorKind;
  retryable: boolean;
  requestId?: string;
  validationFields: Record<string, string> | null;
  rateLimitInfo: { retryAfter?: string | number; used?: number; limit?: number } | null;
  raw?: ApiErrorResponse; // Only when includeRaw: true
};

type ApplyFormErrorsOptions<T> = {
  fallbackField?: Path<T>;
  rootKey?: "root" | `root.${string}`;
  fieldMap?: Partial<Record<string, Path<T>>>;
  applyAuthErrors?: boolean;
};
```

## Summary

| Function | Purpose |
|----------|---------|
| `analyzeError(error)` | Single entry point for normalization |
| `applyFormErrors(ui, form, options)` | Apply errors to react-hook-form |
| `hasFieldErrors(ui)` | Type guard for field-level errors |
| `shouldRedirectToLogin(ui)` | Check if redirect required |
| `getFirstFieldError(errors)` | Find first error for scroll |
| `clearRootError(form)` | Clear root on user input |
| `getErrorMessage(error)` | Extract message for toasts |
