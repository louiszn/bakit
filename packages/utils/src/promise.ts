import type { FunctionLike } from "./types/index.js";

export type PromisifyValue<T> = T extends Promise<unknown> ? T : Promise<T>;
export type Promisify<T> = T extends FunctionLike
	? FunctionLike<Parameters<T>, PromisifyValue<ReturnType<T>>>
	: PromisifyValue<T>;

export function promisify<T>(target: T): Promisify<T> {
	if (typeof target === "function") {
		const fn: FunctionLike = async (...args: unknown[]) => await target(...args);
		return fn as Promisify<T>;
	}

	return Promise.resolve(target) as Promisify<T>;
}

export function sleep(duration: number) {
	return new Promise((res) => setTimeout(res, duration));
}
