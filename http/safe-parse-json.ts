import {
  InvalidParamError,
  PayloadTooLargeError,
} from "../errors/domain/domain-errors";

type SafeParseJsonOptions = {
  maxSize: number;
};

/**
 * Safely parse JSON from a Request with size validation.
 *
 * - Checks Content-Length header before parsing
 * - Catches JSON syntax errors
 * - Returns typed result
 *
 * @throws PayloadTooLargeError if Content-Length exceeds maxSize
 * @throws InvalidParamError if JSON is malformed
 */
export async function safeParseJson<T = unknown>(
  req: Request,
  options: SafeParseJsonOptions,
): Promise<T> {
  const contentLength = req.headers.get("content-length");

  if (contentLength) {
    const size = Number(contentLength);
    if (size > options.maxSize) {
      throw new PayloadTooLargeError(
        `Request body exceeds limit of ${options.maxSize} bytes`,
      );
    }
  }

  try {
    return (await req.json()) as T;
  } catch {
    throw new InvalidParamError("Malformed JSON body");
  }
}
