import type { FunctionLike, Promisify } from "./types/index.js";

export function promisify<T>(target: T): Promisify<T> {
	if (typeof target === "function") {
		const fn: FunctionLike = async (...args: unknown[]) => await target(...args);
		return fn as Promisify<T>;
	}

	return Promise.resolve(target) as Promisify<T>;
}

export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	return "then" in value && typeof value.then === "function";
}

export function sleep(duration: number) {
	return new Promise((res) => setTimeout(res, duration));
}
