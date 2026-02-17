export class AssertionError extends Error {
  constructor(message: string) {
    super(`Assertion failed: ${message}`);
    this.name = "AssertionError";
  }

  static is(error: unknown): error is AssertionError {
    return error instanceof AssertionError;
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function ensure<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new AssertionError(message);
  }
  return value;
}

export function assertNever(value: never, name: string): never {
  throw new AssertionError(`Unexpected value for ${name}: ${String(value)}`);
}

export function notImplemented(thing: string): never {
  throw new AssertionError(`${thing} is not implemented`);
}
