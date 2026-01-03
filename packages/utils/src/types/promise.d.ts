import type { FunctionLike } from "./index.d.ts";

export type PromisifyValue<T> = T extends PromiseLike<unknown> ? T : Promise<T>;
export type Promisify<T> = T extends FunctionLike
	? FunctionLike<Parameters<T>, PromisifyValue<ReturnType<T>>>
	: PromisifyValue<T>;

export type Awaitable<T> = Promise<T> | T;

export type ResolveFn<T = unknown> = (value: T) => void;
export type RejectFn<E = unknown> = (error: E) => void;
