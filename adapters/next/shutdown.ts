import { logger } from "../../core/logger/logger";

type ShutdownCallback = {
  name: string;
  fn: () => Promise<void>;
};

type ShutdownState = {
  callbacks: ShutdownCallback[];
  isShuttingDown: boolean;
  handlersRegistered: boolean;
};

const GLOBAL_KEY = "__foundation_shutdown__";
const SHUTDOWN_TIMEOUT_MS = 10_000;

function getState(): ShutdownState {
  if (!(globalThis as Record<string, unknown>)[GLOBAL_KEY]) {
    (globalThis as Record<string, unknown>)[GLOBAL_KEY] = {
      callbacks: [],
      isShuttingDown: false,
      handlersRegistered: false,
    };
  }
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as ShutdownState;
}

export function registerShutdownCallback(
  name: string,
  fn: () => Promise<void>,
): void {
  const state = getState();

  const existingIndex = state.callbacks.findIndex((c) => c.name === name);
  if (existingIndex !== -1) {
    state.callbacks[existingIndex] = { name, fn };
  } else {
    state.callbacks.push({ name, fn });
  }

  // Auto-initialize handlers on first registration
  if (!state.handlersRegistered) {
    initializeShutdownHandlers();
  }
}

/**
 * Internal helper to set up process signal listeners.
 * Called automatically by registerShutdownCallback.
 */
function initializeShutdownHandlers(): void {
  const state = getState();

  if (state.handlersRegistered) return;
  state.handlersRegistered = true;

  const shutdown = async (signal: string) => {
    if (state.isShuttingDown) return;
    state.isShuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`, {
      layer: "infrastructure",
      callbacks: state.callbacks.map((c) => c.name),
    });

    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Callback timeout")), ms),
        ),
      ]);

    const results = await Promise.allSettled(
      state.callbacks.map(({ name, fn }) =>
        withTimeout(fn(), SHUTDOWN_TIMEOUT_MS).catch((err) => {
          logger.error(err, {
            context: "shutdown_callback",
            callbackName: name,
          });
          throw err;
        }),
      ),
    );

    const failedCount = results.filter((r) => r.status === "rejected").length;

    if (failedCount > 0) {
      logger.warn(`Shutdown completed with ${failedCount} failed callback(s)`, {
        layer: "infrastructure",
      });
      process.exit(1);
    }

    logger.info("Graceful shutdown completed", { layer: "infrastructure" });
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
