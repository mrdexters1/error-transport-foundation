// Isomorphic logger with automated server-side request tracing
import { isServer } from "../runtime/runtime";
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Global resolver for requestId (e.g. from AsyncLocalStorage or browser trace).
 * Automatically hooks into requestContext on server-side.
 */
let requestIdResolver: () => string | undefined = () => {
  if (isServer()) {
    // Dynamic import to keep isomorphic build clean
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { requestContext } = require("../runtime/request-context.server");
      return requestContext.getRequestId();
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const setRequestIdResolver = (fn: typeof requestIdResolver): void => {
  requestIdResolver = fn;
};

/**
 * Core structured fields that must be at the top level of every log for indexing.
 */
export interface LogMetadata {
  requestId?: string;
  code?: string;
  status?: number;
  layer?: string;
  operational?: boolean;
  retryable?: boolean;
}

/**
 * The input context for logging. Combines structured metadata with any custom data.
 */
export type LogContext = LogMetadata & Record<string, unknown>;

/**
 * Final data structure sent to the LoggerProvider.
 */
export interface LogData extends LogMetadata {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  originalError?: unknown;
}

export interface LoggerProvider {
  debug?: (data: LogData) => void;
  info?: (data: LogData) => void;
  warn?: (data: LogData) => void;
  error: (data: LogData) => void;
}

/**
 * Default provider uses native console methods with objects directly.
 * Console methods natively display objects without serialization overhead.
 * Debug is disabled in production to avoid any overhead.
 */
const isProduction = process.env.NODE_ENV === "production";

const defaultProvider: LoggerProvider = {
  debug: isProduction ? undefined : (data) => console.debug("[DEBUG]", data),
  info: (data) => console.info("[INFO]", data),
  warn: (data) => console.warn("[WARN]", data),
  error: (data) => console.error("[ERROR]", data),
};

let currentProvider: LoggerProvider = defaultProvider;

/**
 * Keys that should always be promoted to the top level of LogData.
 */
const METADATA_KEYS = [
  "requestId",
  "code",
  "status",
  "layer",
  "operational",
  "retryable",
] as const;

const createLogData = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  extra?: Partial<LogData>,
): LogData => {
  const finalMetadata: LogMetadata = extra ? { ...extra } : {};
  let remainingContext: Record<string, unknown> | undefined;

  // 1. Process context to separate metadata from payload
  if (context) {
    for (const key in context) {
      const value = context[key];
      if (METADATA_KEYS.includes(key as (typeof METADATA_KEYS)[number])) {
        // Safe assignment for known keys
        (finalMetadata as Record<string, unknown>)[key] = value;
      } else {
        if (!remainingContext) remainingContext = {};
        remainingContext[key] = value;
      }
    }
  }

  // 2. Fetch requestId from resolver if missing (e.g. from server context or browser trace)
  const requestId = finalMetadata.requestId || requestIdResolver();

  // 3. Construct the final structured log.
  // We apply level and message LAST to prevent them from being overwritten by extra.
  return {
    timestamp: new Date().toISOString(),
    ...finalMetadata,
    requestId,
    context: remainingContext,
    originalError: extra?.originalError,
    // Immutable core fields
    level,
    message,
  };
};

export const logger = {
  setProvider(provider: LoggerProvider): void {
    currentProvider = provider;
  },

  resetProvider(): void {
    currentProvider = defaultProvider;
  },

  debug(messageOrError: unknown, context?: LogContext): void {
    try {
      const message =
        messageOrError instanceof Error
          ? messageOrError.message
          : String(messageOrError);
      currentProvider.debug?.(
        createLogData("debug", message, context, {
          originalError:
            messageOrError instanceof Error ? messageOrError : undefined,
        }),
      );
    } catch (err) {
      console.error("[Logger] debug failed:", err);
    }
  },

  info(messageOrError: unknown, context?: LogContext): void {
    try {
      const message =
        messageOrError instanceof Error
          ? messageOrError.message
          : String(messageOrError);
      currentProvider.info?.(
        createLogData("info", message, context, {
          originalError:
            messageOrError instanceof Error ? messageOrError : undefined,
        }),
      );
    } catch (err) {
      console.error("[Logger] info failed:", err);
    }
  },

  warn(messageOrError: unknown, context?: LogContext): void {
    try {
      const message =
        messageOrError instanceof Error
          ? messageOrError.message
          : String(messageOrError);
      currentProvider.warn?.(
        createLogData("warn", message, context, {
          originalError:
            messageOrError instanceof Error ? messageOrError : undefined,
        }),
      );
    } catch (err) {
      console.error("[Logger] warn failed:", err);
    }
  },

  error(error: unknown, context?: LogContext): void {
    try {
      const message = error instanceof Error ? error.message : String(error);

      currentProvider.error(
        createLogData("error", message, context, {
          originalError: error,
        }),
      );
    } catch (err) {
      console.error("[Logger] error failed:", err, "Original error:", error);
    }
  },
};
