import { GraphQLUpstreamError } from "../errors/transport/graphql-error";
import { fetchJSON } from "./fetch-json";

/**
 * Standard GraphQL error shape.
 */
export interface GraphQLError {
  readonly message: string;
  readonly locations?: ReadonlyArray<{
    readonly line: number;
    readonly column: number;
  }>;
  readonly path?: ReadonlyArray<string | number>;
  readonly extensions?: Record<string, unknown>;
}

/**
 * Standard GraphQL response shape.
 */
export interface GraphQLResponse<T> {
  readonly data?: T | null;
  readonly errors?: readonly GraphQLError[];
}

/**
 * Parameters for GraphQL fetch operation.
 */
export type FetchGraphQLParams = {
  /** Target API URL */
  readonly url: string;
  /** GraphQL query or mutation string */
  readonly query: string;
  /** Variables to pass with the query */
  readonly variables?: Record<string, unknown>;
  /** Bearer token for authorization */
  readonly authToken?: string;
  /** Explicit request ID for traceability */
  readonly requestId?: string;
  /** Custom headers to merge into the request */
  readonly headers?: Partial<Record<string, string>>;
};

/**
 * Type-safe GraphQL client built on top of fetchJSON.
 * Standardizes error handling and response parsing for GraphQL services.
 *
 * Features:
 * - Automatic mapping of GraphQL errors to GraphQLUpstreamError.
 * - End-to-end traceability via requestId propagation.
 * - Support for Thrift+JSON content types (inherited from fetchJSON).
 */
export async function fetchGraphQL<T = unknown>({
  url,
  query,
  variables,
  authToken,
  requestId,
  headers,
}: FetchGraphQLParams): Promise<T> {
  const result = await fetchJSON<GraphQLResponse<T>>({
    url,
    method: "POST",
    authToken,
    requestId,
    headers,
    body: {
      query,
      variables,
    },
  });

  // Check for GraphQL-level errors (even if HTTP status was 200)
  if (result.errors && result.errors.length > 0) {
    const firstMessage = result.errors[0]?.message ?? "Unknown GraphQL error";
    throw new GraphQLUpstreamError(`Upstream GraphQL error: ${firstMessage}`, {
      cause: result.errors,
    });
  }

  // Ensure data is present when no errors are returned
  if (result.data === null || result.data === undefined) {
    throw new GraphQLUpstreamError(
      "GraphQL operation succeeded but returned no data",
    );
  }

  return result.data;
}
