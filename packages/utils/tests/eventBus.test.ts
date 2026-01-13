import { describe, it, expect, vi } from "vitest";
import { createEventBus, attachEventBus, type EventMap } from "@/index.js";

interface TestEvents extends EventMap {
	foo: [number, string];
	bar: [];
	error: [Error];
}

describe("createEventBus", () => {
	it("calls listeners registered with on()", () => {
		const bus = createEventBus<TestEvents>();
		const handler = vi.fn();

		bus.on("foo", handler);
		bus.emit("foo", 1, "hello");

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(1, "hello");
	});

	it("calls listeners registered with once() only once", () => {
		const bus = createEventBus<TestEvents>();
		const handler = vi.fn();

		bus.once("foo", handler);
		bus.emit("foo", 1, "a");
		bus.emit("foo", 2, "b");

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(1, "a");
	});

	it("removes a specific listener with off()", () => {
		const bus = createEventBus<TestEvents>();
		const handler = vi.fn();

		bus.on("foo", handler);
		bus.off("foo", handler);
		bus.emit("foo", 1, "test");

		expect(handler).not.toHaveBeenCalled();
	});

	it("removes all listeners for an event with off(event)", () => {
		const bus = createEventBus<TestEvents>();
		const a = vi.fn();
		const b = vi.fn();

		bus.on("foo", a);
		bus.on("foo", b);
		bus.off("foo");
		bus.emit("foo", 1, "x");

		expect(a).not.toHaveBeenCalled();
		expect(b).not.toHaveBeenCalled();
	});

	it("removes all listeners with removeAllListeners()", () => {
		const bus = createEventBus<TestEvents>();
		const a = vi.fn();
		const b = vi.fn();

		bus.on("foo", a);
		bus.on("bar", b);
		bus.removeAllListeners();

		bus.emit("foo", 1, "x");
		bus.emit("bar");

		expect(a).not.toHaveBeenCalled();
		expect(b).not.toHaveBeenCalled();
	});

	it("throws if error event is emitted without listeners", () => {
		const bus = createEventBus<TestEvents>();
		const err = new Error("boom");

		expect(() => {
			bus.emit("error", err);
		}).toThrow(err);
	});

	it("does not throw error if error event has listeners", () => {
		const bus = createEventBus<TestEvents>();
		const handler = vi.fn();

		bus.on("error", handler);
		const err = new Error("handled");

		expect(() => {
			bus.emit("error", err);
		}).not.toThrow();

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(err);
	});
});

describe("attachEventBus", () => {
	it("attaches event bus methods to an object", () => {
		const base = { value: 42 };
		const obj = attachEventBus<TestEvents, typeof base>(base);

		const handler = vi.fn();

		obj.on("foo", handler).emit("foo", 123, "attached");

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(123, "attached");
	});

	it("returns the base object for chaining", () => {
		const base = {};
		const obj = attachEventBus<TestEvents, typeof base>(base);

		const result = obj.on("bar", () => {}).once("bar", () => {});

		expect(result).toBe(base);
	});
});
