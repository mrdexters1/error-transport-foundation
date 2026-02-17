/**
 * Checks if a value is a non-null object.
 */
export const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object" && data !== null;

/**
 * Checks if a value is an array.
 */
export const isArray = (data: unknown): data is unknown[] =>
  Array.isArray(data);

/**
 * Checks if a value is an array where every element satisfies the provided type guard.
 */
export const isArrayOf = <T>(
  data: unknown,
  guard: (item: unknown) => item is T,
): data is T[] => Array.isArray(data) && data.every(guard);

/**
 * Checks if a value is an array of T with at least the specified length.
 */
export const isArrayOfMinLength = <T>(
  data: unknown,
  guard: (item: unknown) => item is T,
  minLength: number,
): data is T[] => isArrayOf(data, guard) && data.length >= minLength;

/**
 * Checks if a value is a non-empty array of T.
 */
export const isNonEmptyArrayOf = <T>(
  data: unknown,
  guard: (item: unknown) => item is T,
): data is [T, ...T[]] => isArrayOf(data, guard) && data.length > 0;

/**
 * Checks if a string key exists in an object.
 */
export const isKeyof = <O extends Record<string, unknown>>(
  key: string,
  obj: O,
): key is keyof O & string => key in obj;

/**
 * Checks if a value is a string.
 */
export const isString = (data: unknown): data is string =>
  typeof data === "string";

/**
 * Checks if a value is a valid number (excluding NaN).
 */
export const isNumber = (data: unknown): data is number =>
  typeof data === "number" && !Number.isNaN(data);

/**
 * Checks if a string represents a numeric value.
 */
export const isNumericString = (data: unknown): data is string =>
  typeof data === "string" && data.trim() !== "" && !Number.isNaN(Number(data));

/**
 * Checks if a value is a valid Date instance.
 */
export const isDate = (data: unknown): data is Date =>
  data instanceof Date && !Number.isNaN(data.getTime());

/**
 * Checks if a value is a boolean.
 */
export const isBoolean = (data: unknown): data is boolean =>
  typeof data === "boolean";

/**
 * Checks if a value matches one of the object's values.
 */
export const isValueOf = <O extends Record<string, unknown>>(
  obj: O,
  value: unknown,
): value is O[keyof O] => Object.values(obj).includes(value as O[keyof O]);

/**
 * Checks if an object contains all specified keys.
 */
export const hasKeys = <K extends string>(
  obj: Record<K, unknown>,
  keys: K[],
): obj is Record<K, unknown> => keys.every((key) => key in obj);

/**
 * Checks if an unknown value is an object containing specific keys.
 */
export const hasKeysByUnknown = <K extends string>(
  obj: unknown,
  keys: K[],
): obj is Record<K, unknown> => isRecord(obj) && hasKeys<K>(obj, keys);

/**
 * Checks if a value is null or undefined.
 */
export const isNullish = (value: unknown): value is null | undefined =>
  value == null;

/**
 * Checks if a value is not null or undefined.
 */
export const isNotNullish = <T>(value: T | null | undefined): value is T =>
  !isNullish(value);
