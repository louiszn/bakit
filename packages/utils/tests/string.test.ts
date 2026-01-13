import { describe, it, expect } from "vitest";
import { capitalize } from "@/index.js";

describe("capitalize", () => {
	it("capitalizes the first character", () => {
		expect(capitalize("hello")).toBe("Hello");
	});

	it("returns the same string if already capitalized", () => {
		expect(capitalize("Hello")).toBe("Hello");
	});

	it("only affects the first character", () => {
		expect(capitalize("hELLO")).toBe("HELLO");
	});

	it("handles empty strings", () => {
		expect(capitalize("")).toBe("");
	});

	it("handles non-ascii characters", () => {
		expect(capitalize("đạt")).toBe("Đạt");
	});
});
