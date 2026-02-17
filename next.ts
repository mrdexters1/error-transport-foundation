/**
 * Next.js Integration Entry Point
 *
 * Only thin wrappers. No logic.
 *
 * Usage:
 * ```ts
 * import { withErrorHandler, withActionHandler } from '@/foundation/next';
 * ```
 */

export { withActionHandler } from "./adapters/next/actions/with-action-handler";
export { withErrorHandler } from "./adapters/next/http/with-error-handler";
