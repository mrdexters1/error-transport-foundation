import { assert } from "../assert/assert";
import {
  isDate,
  isKeyof,
  isNullish,
  isNumber,
  isString,
  isValueOf,
} from "../utils/guards";

/**
 * Represents a runtime type coercion function.
 */
export type AsType<Out = unknown, In = unknown> = (
  value: In,
  varName: string,
) => Out;

type TestFn<T> = (value: T, varName: string) => string | undefined;

/**
 * Responsible for asserting a value using a custom test function.
 */
const assertByTest = <T>(value: T, varName: string, test: TestFn<T>): T => {
  const msg = test(value, varName);
  assert(!msg, `${varName}: ${msg}`);
  return value;
};

/* ========================================
   STRING
======================================== */

/**
 * Responsible for asserting that a value is a string.
 */
export const asString: AsType<string> = (value, name) => {
  assert(isString(value), `${name} must be a string`);
  return value;
};

/**
 * Responsible for asserting that a value is a non-empty string.
 */
export const asStringNonEmpty: AsType<string> = (value, name) => {
  assert(
    isString(value) && value.trim().length > 0,
    `${name} must be a non-empty string`,
  );
  return value;
};

/**
 * Responsible for asserting that a string matches a regular expression.
 */
export const asStringRegex =
  (rx: RegExp, msg?: string): AsType<string> =>
  (value, name) =>
    assertByTest(asString(value, name), name, (v) =>
      rx.test(v) ? undefined : (msg ?? `must match ${rx}`),
    );

/* ========================================
   NUMBER
======================================== */

/**
 * Responsible for asserting that a value is a valid number.
 */
export const asNumber: AsType<number> = (value, name) => {
  const n = Number(value);
  assert(isNumber(n), `${name} must be a valid number`);
  return n;
};

/**
 * Responsible for asserting that a number is within a specific range.
 */
export const asNumberInRange =
  (min: number, max: number): AsType<number> =>
  (value, name) =>
    assertByTest(asNumber(value, name), name, (n) =>
      n < min || n > max ? `must be between ${min} and ${max}` : undefined,
    );

/* ========================================
   DATE
======================================== */

/**
 * Responsible for asserting that a value is a valid date.
 */
export const asDate: AsType<Date> = (value, name) => {
  const timestamp = isNumber(value)
    ? value
    : isString(value)
      ? Date.parse(value)
      : NaN;

  const date = new Date(timestamp);

  assert(isDate(date), `${name} must be a valid date`);
  return date;
};

/* ========================================
   BOOLEAN
======================================== */

const BOOL_MAP = {
  true: true,
  on: true,
  "1": true,
  yes: true,
  false: false,
  off: false,
  "0": false,
  no: false,
} as const;

/**
 * Responsible for asserting that a value is a boolean-like string.
 */
export const asBoolean: AsType<boolean> = (value, name) => {
  assert(
    isString(value) && isKeyof(value, BOOL_MAP),
    `${name} must be a boolean-like string`,
  );
  return BOOL_MAP[value];
};

/* ========================================
   ENUM
======================================== */

/**
 * Responsible for asserting that a value is one of the enum values.
 */
export const asValueOfEnum =
  <V>(obj: Record<string | number, V>): AsType<V> =>
  (value, name) => {
    assert(
      isValueOf(obj, value),
      `${name} must be one of ${Object.keys(obj).join(", ")}`,
    );
    return value;
  };

/* ========================================
   OPTIONAL
======================================== */

/**
 * Responsible for allowing undefined values with an optional default.
 */
export const asOptional =
  <T>(fn: AsType<T>, defaultValue?: T): AsType<T | undefined> =>
  (value, name) => {
    if (isNullish(value)) return defaultValue;
    return fn(value, name);
  };
