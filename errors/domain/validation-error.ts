import { DomainError } from "../core/base-error";

/**
 * Error thrown when data validation fails.
 * Domain-level: doesn't know about HTTP 422, only about which data is invalid.
 */
import { ErrorCodes } from "../core/error-codes";

export class ValidationError extends DomainError {
  static is(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }

  readonly code = ErrorCodes.VALIDATION_ERROR;
  readonly fields: Record<string, string>;

  constructor(
    fields: Record<string, string> | string,
    message?: string,
    options?: { cause?: unknown },
  ) {
    const fieldsObj =
      typeof fields === "string"
        ? { [fields]: message ?? "Invalid value" }
        : fields;

    const firstMessage =
      message ?? Object.values(fieldsObj)[0] ?? "Validation failed";

    super(firstMessage, options);
    this.fields = fieldsObj;
  }
}
