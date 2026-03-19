import { initializeFoundationServer } from "../../server";

let isInitialized = false;

/**
 * Combined initialization for all foundation features (Tracing, Logging, Shutdown).
 * Recommended to call this once in Next.js `instrumentation.ts`.
 */
export const initFoundation = () => {
  ensureFoundationInitialized();
};

/**
 * Ensures foundation server-side features (logger, tracing) are initialized.
 * Safe to call multiple times (idempotent).
 */
export const ensureFoundationInitialized = () => {
  if (isInitialized) return;
  initializeFoundationServer();
  isInitialized = true;
};
