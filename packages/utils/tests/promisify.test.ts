import { describe, it, expect, vi } from "vitest";
import { promisify, isPromiseLike, sleep } from "@/index.js";

describe("promisify", () => {
	it("wraps a value into a resolved promise", async () => {
		const result = promisify(42);
		await expect(result).resolves.toBe(42);
	});

	it("wraps a function and preserves return value", async () => {
		const fn = (a: number, b: number) => a + b;
		const asyncFn = promisify(fn);

		const result = await asyncFn(2, 3);
		expect(result).toBe(5);
	});

	it("wraps an async function without changing behavior", async () => {
		const fn = async () => "ok";
		const asyncFn = promisify(fn);

		await expect(asyncFn()).resolves.toBe("ok");
	});
});

describe("isPromiseLike", () => {
	it("returns true for a real Promise", () => {
		expect(isPromiseLike(Promise.resolve())).toBe(true);
	});

	it("returns true for a thenable object", () => {
		const thenable = { then: vi.fn() };
		expect(isPromiseLike(thenable)).toBe(true);
	});

	it("returns false for non-objects", () => {
		expect(isPromiseLike(null)).toBe(false);
		expect(isPromiseLike(undefined)).toBe(false);
		expect(isPromiseLike(123)).toBe(false);
		expect(isPromiseLike("test")).toBe(false);
	});

	it("returns false for objects without then()", () => {
		expect(isPromiseLike({})).toBe(false);
	});
});

describe("sleep", () => {
	it("resolves after the given duration", async () => {
		const start = Date.now();
		await sleep(50);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(45);
	});

	it("rejects with AbortError if aborted before timeout", async () => {
		const controller = new AbortController();

		const promise = sleep(100, controller.signal);
		controller.abort();

		await expect(promise).rejects.toMatchObject({
			name: "AbortError",
		});
	});

	it("rejects with AbortError if aborted during sleep", async () => {
		const controller = new AbortController();

		const promise = sleep(100, controller.signal);

		setTimeout(() => controller.abort(), 20);

		await expect(promise).rejects.toMatchObject({
			name: "AbortError",
		});
	});

	it("cleans up abort listener after resolve", async () => {
		const controller = new AbortController();
		const spy = vi.spyOn(controller.signal, "removeEventListener");

		await sleep(10, controller.signal);

		expect(spy).toHaveBeenCalled();
	});
});
