import type { FunctionLike, Promisify } from "@/types/index.js";

/**
 * Promisify a value.
 *
 * If the value is a function, it will be wrapped in an async function
 * that calls the original function with the given arguments.
 * If the value is not a function, it will be wrapped in a resolved promise.
 *
 * @param target - The value to be wrapped.
 * @returns A promise that resolves to the return value of the target function, or the target value itself if it is not a function.
 */
export function promisify<T>(target: T): Promisify<T> {
	if (typeof target === "function") {
		const fn: FunctionLike = async function (this: unknown, ...args) {
			return await target.apply(this, args);
		};

		return fn as Promisify<T>;
	}

	return Promise.resolve(target) as Promisify<T>;
}

/**
 * Checks if a value is a promise-like object.
 *
 * A promise-like object is defined as having a `then` property that is a function.
 *
 * @param value - The value to check.
 * @returns True if the value is a promise-like object, false otherwise.
 */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	return "then" in value && typeof value.then === "function";
}

/**
 * Sleeps for a given duration and returns a promise that resolves when the sleep is over.
 * If an AbortSignal is provided, the promise will be rejected with an AbortError if the signal is aborted during the sleep.
 *
 * @param duration The duration to sleep for in milliseconds.
 * @param signal An AbortSignal to listen for abort events.
 * @returns A promise that resolves when the sleep is over, or rejects with an AbortError if the signal is aborted during the sleep.
 */
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
