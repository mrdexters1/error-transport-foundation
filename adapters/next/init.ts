import { initializeFoundationServer } from "../../server";

let isInitialized = false;

/**
 * Ensures foundation server-side features (logger, tracing) are initialized.
 * Safe to call multiple times (idempotent).
 */
export const ensureFoundationInitialized = () => {
  if (isInitialized) return;
  initializeFoundationServer();
  isInitialized = true;
};
