import { ApplicationError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";

/**
 * Represents an unhandled or unknown error.
 * Categorized as an ApplicationError because it usually represents
 * a programmer error or an unpredicted state.
 */
export class UnexpectedError extends ApplicationError {
  readonly code = ErrorCodes.UNEXPECTED_ERROR;
  readonly internalMessage: string;

  constructor(options?: { cause?: unknown }) {
    const internalMessage =
      options?.cause instanceof Error
        ? options.cause.message
        : "No original message";

    const displayMessage =
      options?.cause instanceof Error
        ? `Unexpected: ${internalMessage}`
        : "An unexpected error occurred";

    super(displayMessage, options);
    this.internalMessage = internalMessage;
  }
}
