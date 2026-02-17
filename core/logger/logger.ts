// No direct import of requestContext to stay isomorphic
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Global resolver for requestId (e.g. from AsyncLocalStorage or browser trace).
 * This allows the logger to stay isomorphic while still supporting trace IDs.
 */
let requestIdResolver: () => string | undefined = () => undefined;

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

const defaultProvider: LoggerProvider = {
  debug: (data) => console.debug(JSON.stringify(data)),
  info: (data) => console.info(JSON.stringify(data)),
  warn: (data) => console.warn(JSON.stringify(data)),
  error: (data) => console.error(JSON.stringify(data)),
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
      // Last resort fallback
      console.error("[Logger] error failed:", err, "Original error:", error);
    }
  },
};
