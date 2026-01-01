// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionLike<A extends any[] = any[], R = any> = (...args: A) => R;

export * from "./promise.d.ts";
