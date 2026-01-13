import { describe, it, expect } from "vitest";
import { isPlainObject } from "@/index.js";

describe("isPlainObject", () => {
	it("returns true for plain objects", () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject({ a: 1 })).toBe(true);
	});

	it("returns false for null and primitives", () => {
		expect(isPlainObject(null)).toBe(false);
		expect(isPlainObject(undefined)).toBe(false);
		expect(isPlainObject(123)).toBe(false);
		expect(isPlainObject("test")).toBe(false);
	});

	it("returns false for arrays", () => {
		expect(isPlainObject([])).toBe(false);
	});

	it("returns false for built-in objects", () => {
		expect(isPlainObject(new Date())).toBe(false);
		expect(isPlainObject(new Map())).toBe(false);
	});

	it("returns false for class instances and functions", () => {
		class Foo {}
		expect(isPlainObject(new Foo())).toBe(false);
		expect(isPlainObject(() => {})).toBe(false);
	});
});
