import { InfrastructureError } from "../core/base-error";
import { ErrorCodes } from "../core/error-codes";

export class GraphQLUpstreamError extends InfrastructureError {
  readonly code = ErrorCodes.GRAPHQL_ERROR;
  readonly retryable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}
