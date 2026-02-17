# Guards and Validation

## Type Guards

Foundation provides basic type guards:

```ts
import { isString, isNumber, isRecord, isNullish, isNotNullish } from "@/foundation";

if (isString(value)) {
  value.toUpperCase(); // TypeScript knows it's string
}

const users = [null, user1, undefined, user2].filter(isNotNullish);
// users: User[]
```

## ValidationError

Throw when user input is invalid:

```ts
import { ValidationError } from "@/foundation";

// Single field
throw new ValidationError("email", "Invalid email format");

// Multiple fields
throw new ValidationError({
  email: "Invalid email format",
  password: "Must be at least 8 characters",
});

// With custom message
throw new ValidationError(
  { email: "Invalid format" },
  "Please fix the highlighted fields"
);
```

ValidationError maps to HTTP 422 in the processing layer.

## asType Validators

For URL params and external input:

```ts
import { asString, asNumber, asStringNonEmpty, asOptional } from "@/foundation";

// Throws ValidationError if not a non-empty string
const id = asStringNonEmpty(params.id, "id");

// Throws if not a valid number
const page = asNumber(query.page, "page");

// Optional with default
const limit = asOptional(asNumber, 20)(query.limit, "limit");
```

Available validators:
- `asString` — any string
- `asStringNonEmpty` — non-empty string
- `asStringRegex` — string matching regex
- `asNumber` — valid number
- `asNumberInRange` — number within range
- `asDate` — valid date
- `asBoolean` — boolean-like string (`"true"`, `"1"`, `"yes"`)
- `asValueOfEnum` — value from enum object
- `asOptional` — allows undefined with optional default

## What Belongs in Foundation

**Do include:**
- Generic type guards (`isString`, `isRecord`)
- Base validation utilities (`asString`, `asNumber`)
- ValidationError class

**Do not include:**
- Business-specific validation (`isValidEmail`, `isValidJobId`)
- Zod schemas
- Form validation logic
- Project-specific constants
- Database validation
- Authorization rules

## Integration with Zod

Foundation doesn't include Zod. Use Zod (or any schema library) at the application layer:

```ts
import { ValidationError } from "@/foundation";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export const createUser = withActionHandler(async (data: unknown) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    throw new ValidationError(
      Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, v?.[0] ?? "Invalid"])
      )
    );
  }

  return await saveUser(result.data);
});
```

## Error Response

ValidationError produces:

```json
{
  "apiVersion": "1.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "code": "VALIDATION_ERROR",
  "status": 422,
  "message": "Invalid email format",
  "requestId": "abc-123",
  "retryable": false,
  "layer": "domain",
  "meta": { "type": "VALIDATION", "fields": { "email": "Invalid email format" } }
}
```

Field-level details are available in `meta.fields`. Adapters may choose whether to expose field metadata to clients.
