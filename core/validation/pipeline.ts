/**
 * Represents a validation transformation function.
 */
export type ValidationFn<A, B> = (value: A, varName: string) => B;

/**
 * Represents a validation pipeline.
 */
export interface ValidationPipeline<A, B> {
  pipe<C>(fn: ValidationFn<B, C>): ValidationPipeline<A, C>;
  run(value: A, varName: string): B;
}

/**
 * Responsible for composing validation functions.
 */
export const asPipe = <A, B>(
  fn: ValidationFn<A, B>,
): ValidationPipeline<A, B> => ({
  pipe<C>(next: ValidationFn<B, C>): ValidationPipeline<A, C> {
    return asPipe((value: A, name: string) => next(fn(value, name), name));
  },

  run(value: A, name: string): B {
    return fn(value, name);
  },
});
