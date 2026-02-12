/**
 * Represents a class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any, Args extends any[] = any[]> = new (...args: Args) => T;

/**
 * Represents an abstract class constructor.
 *
 * @template T - The instance type produced by the constructor.
 * @template Args - The argument tuple accepted by the constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T = any, Args extends any[] = any[]> = abstract new (...args: Args) => T;
