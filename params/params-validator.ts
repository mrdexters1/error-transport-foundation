import type { AsType } from "../core/validation/as-type";
import { ValidationError } from "../errors/domain/validation-error";

type ValidParams<V extends Record<string, AsType>> = {
  [K in keyof V]: V[K] extends AsType ? ReturnType<V[K]> : never;
};

/**
 * Creates a reusable validator for route or request params.
 * Throws ValidationError on invalid input.
 *
 * @example
 * const validateParams = createParamsValidator("path params", {
 *   id: asStringNonEmpty,
 *   page: asNumber,
 * });
 *
 * const { id, page } = validateParams(params);
 */
export const createParamsValidator =
  <V extends Record<string, AsType>>(type: string, validators: V) =>
  (params: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(validators).map(([key, asType]) => {
        try {
          return [key, asType(params[key], key)];
        } catch (err) {
          const message =
            err instanceof Error ? err.message : `Invalid ${key} in ${type}`;
          throw new ValidationError(key, `${type}: ${message}`);
        }
      }),
    ) as ValidParams<V>;
