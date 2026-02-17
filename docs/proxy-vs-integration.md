# Proxy vs Integration Mode

Mode affects how upstream errors are interpreted by the policy layer.

## The Problem

When calling an internal API:
- **400 from backend** — is this our bug or expected user error?
- **422 validation** — should we alert or pass through?

The answer depends on context.

## Two Modes

Mode is defined per call and affects error interpretation only, not transport behavior.

### Integration Mode (Default)

We own the contract. Errors indicate bugs.

```ts
await fetchInternal({ url: "/v1/users", method: "POST", body: data });
// mode: "integration" (implicit)
```

Behavior:
- 4xx typically indicates a contract violation
- 5xx = infrastructure failure (backend unavailable or crashed)
- `shouldReport: true`
- `shouldExpose: false` (hide details from user)

### Proxy Mode

We're passing user input through. Errors are expected.

```ts
await fetchInternal({
  url: "/v1/users",
  method: "POST",
  body: userInput,
  mode: "proxy"
});
```

Behavior:
- 4xx = **expected** (user sent bad data)
- 5xx = infrastructure failure (log as error)
- `shouldReport: false`
- `shouldExpose: true` (show message to user)

## Why 400 Can Be Infrastructure

In integration mode, a 400 error means:

> "We built the request wrong. Our code has a bug."

This is a contract failure from our perspective — the external system rejected our call.

```ts
// Integration: we control the body
await fetchInternal({
  url: "/v1/internal/sync",
  method: "POST",
  body: { userId: user.id },
});
// 400 here = our bug → shouldReport: true

// Proxy: user controls the body
await fetchInternal({
  url: "/v1/jobs/apply",
  method: "POST",
  body: formData,
  mode: "proxy",
});
// 400 here = user error → shouldExpose: true
```

## Policy Comparison

| Aspect | Integration | Proxy |
|--------|-------------|-------|
| 4xx meaning | Contract violation | User error |
| shouldReport | `true` | `false` |
| shouldExpose | `false` | `true` |
| logLevel (4xx) | `error` | `info` |
| logLevel (5xx) | `error` | `error` |

## When to Use Each

**Integration mode:**
- Internal service-to-service calls
- Background jobs
- Scheduled tasks
- Any request where you control all inputs

**Proxy mode:**
- Form submissions forwarded to backend
- User-initiated API calls
- Pass-through endpoints
- Any request where user controls the payload
