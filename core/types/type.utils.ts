/* ========================================================
   FUNCTION TYPES
======================================================== */

/**
 * Represents any function.
 */
export type AnyFn<R = unknown, A extends unknown[] = unknown[]> = (
  ...args: A
) => R;

/**
 * Gets the resolved return type of a function (sync or async).
 */
export type AsyncReturn<Fn extends AnyFn> = Awaited<ReturnType<Fn>>;

/**
 * Converts undefined to never.
 */
export type UndefToNever<T> = T extends undefined ? never : T;

/**
 * Gets the first argument of a function.
 */
export type Arg0<T extends AnyFn> = UndefToNever<Parameters<T>[0]>;

/**
 * Gets the second argument of a function.
 */
export type Arg1<T extends AnyFn> = UndefToNever<Parameters<T>[1]>;

/**
 * Gets the third argument of a function.
 */
export type Arg2<T extends AnyFn> = UndefToNever<Parameters<T>[2]>;

/* ========================================================
   OBJECT / KEY UTILITIES
======================================================== */

/**
 * Excludes keys whose values extend Bad.
 */
export type ExcludeKeysOf<T, Bad = never> = {
  [K in keyof T & string]: T[K] extends Bad ? never : K;
}[keyof T & string];

/**
 * Excludes properties whose values extend Bad.
 */
export type ExcludeValues<T, Bad = never> = Pick<T, ExcludeKeysOf<T, Bad>>;

/**
 * Removes undefined properties (but keeps null).
 */
export type ExcludeMissing<T> = ExcludeValues<T, undefined>;

/**
 * Gets union of object values.
 */
export type ValuesOf<T> = T[keyof T];

/**
 * Gets overlapping keys between two types.
 */
export type OverlapKeys<T1, T2> = keyof T1 & keyof T2;

/**
 * Merges two object types.
 */
export type Merge<T1, T2> = {
  [K in OverlapKeys<T1, T2>]: T1[K] | T2[K];
} & Omit<T1, keyof T2> &
  Omit<T2, keyof T1>;

/**
 * Makes selected keys optional.
 */
export type PartialByKey<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Makes all keys optional except K.
 */
export type PartialExceptKey<T, K extends keyof T> = Partial<Omit<T, K>> &
  Required<Pick<T, K>>;

/**
 * Adds missing properties as optional void placeholders.
 */
export type MissingProps<P> = Partial<Record<keyof P, void>>;

/* ========================================================
   ENUM / PRIMITIVE UTILITIES
======================================================== */

/**
 * Parses numeric literal from string.
 */
export type ParseNumber<T> = T extends `${infer U extends number}` ? U : never;

/**
 * Converts enum to union of its primitive values.
 */
export type EnumToPrimitiveUnion<T> =
  | `${T & string}`
  | ParseNumber<`${T & number}`>;

/* ========================================================
   PROMISE UTILITIES
======================================================== */

/**
 * Extracts value from PromiseSettledResult.
 */
export type PromiseSettledValue<
  T extends PromiseSettledResult<unknown>,
  Rej = never,
> = T extends PromiseFulfilledResult<infer V> ? V : Rej;
