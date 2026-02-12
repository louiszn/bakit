// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionLike<A extends any[] = any[], R = any> = (...args: A) => R;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunctionLike<A extends any[] = any[], R = any> = FunctionLike<A, Promise<R>>;
