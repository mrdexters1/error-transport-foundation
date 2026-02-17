/**
 * OpenAPI type utilities for extracting types from operation schemas.
 * For HttpMethod type, import from '../http-method'.
 */

/**
 * Extracts the response type from an operation
 * @example
 * type X = Response<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type Response<T> = T extends {
  responses: Record<201, { content: { "application/json": infer R } }>;
}
  ? R
  : T extends {
        responses: Record<
          "default",
          { content: { "application/json": infer R } }
        >;
      }
    ? R
    : T extends {
          responses: Record<200, { content: { "application/json": infer R } }>;
        }
      ? R
      : T extends {
            responses: Record<
              number,
              { content: { "application/json": infer R } }
            >;
          }
        ? R
        : never;

/**
 * Extracts the parameters type from an operation
 * @example
 * type X = Params<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type Params<T> = T extends { parameters: infer P } ? P : never;

/**
 * Extracts the path parameters type from an operation
 * @example
 * type X = PathParams<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type PathParams<T> = Params<T> extends { path: infer P } ? P : never;

/**
 * Extracts the query parameters type from an operation
 * @example
 * type X = Query<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type Query<T> = Params<T> extends { query?: infer Q } ? Q : never;

/**
 * Extracts the header parameters type from an operation
 * @example
 * type X = Headers<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type Headers<T> = Params<T> extends { header: infer Q } ? Q : never;

/**
 * Extracts the body type from an operation
 * @example
 * type X = Body<API.OneInchSwap.Paths['/v6.0/{chain}/tokens']['get']>;
 */
export type Body<T> = T extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : T extends {
        requestBody: { content: { "multipart/form-data": infer _FD } };
      }
    ? FormData
    : never;
