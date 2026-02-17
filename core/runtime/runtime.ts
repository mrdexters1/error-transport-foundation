import { assert } from "../assert/assert";

/**
 * Checks if the current runtime is server-side.
 */
export const isServer = (): boolean =>
  typeof window === "undefined" || "Deno" in globalThis;

/**
 * Checks if the current runtime is browser-side.
 */
export const isBrowser = (): boolean => !isServer();

/**
 * Executes a function only if window exists.
 */
export const ifWindow = <T>(defaultValue: T, fn: (w: Window) => T): T =>
  typeof window === "undefined" ? defaultValue : fn(window);

/**
 * Ensures the code runs only on the server.
 */
export const onlyServer = (): void => {
  assert(isServer(), "This code must run on the server");
};

/**
 * Ensures the code runs only in the browser.
 */
export const onlyBrowser = (): void => {
  assert(isBrowser(), "This code must run in the browser");
};
