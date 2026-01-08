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

export function sleep(duration: number, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const cancel = () => reject(new DOMException("Aborted", "AbortError"));

		if (signal?.aborted) {
			cancel();
			return;
		}

		const onAbort = () => {
			clearTimeout(timeout);
			reject(new DOMException("Aborted", "AbortError"));
		};

		const timeout = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, duration);

		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
