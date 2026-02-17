import { BaseError } from "../core/base-error";
import { NetworkError } from "../transport/network-error";
import { UnexpectedError } from "../unexpected/unexpected-error";

/**
 * Converts any unknown error into a structured BaseError.
 */
export const classifyError = (error: unknown): BaseError => {
  if (error instanceof BaseError) {
    return error;
  }

  // Network/infrastructure failures from fetch
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const isNetworkError =
      error.name === "TypeError" &&
      (message.includes("fetch") ||
        message.includes("network") ||
        message.includes("failed to fetch"));

    const isSystemError =
      error.name === "AbortError" ||
      ("code" in error &&
        typeof (error as Record<string, unknown>).code === "string" &&
        ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(
          (error as Record<string, unknown>).code as string,
        ));

    if (isNetworkError || isSystemError) {
      return new NetworkError(error.message || "Network failure or timeout", {
        cause: error,
      });
    }
  }

  return new UnexpectedError({ cause: error });
};
