import { describe, it, expect, vi } from "vitest";
import { createQueue } from "@/index.js";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

describe("createQueue", () => {
	it("executes tasks added to the queue", async () => {
		const queue = createQueue();
		const fn = vi.fn(async () => 42);

		const result = await queue.add(fn);

		expect(result).toBe(42);
		expect(fn).toHaveBeenCalledOnce();
	});

	it("respects concurrency limits", async () => {
		const queue = createQueue({ concurrency: 1 });

		const order: number[] = [];

		const task = (id: number) => async () => {
			order.push(id);
			await sleep(20);
		};

		await Promise.all([queue.add(task(1)), queue.add(task(2)), queue.add(task(3))]);

		expect(order).toEqual([1, 2, 3]);
	});

	it("exposes queue size", async () => {
		const queue = createQueue({ concurrency: 1 });

		queue.add(async () => {
			await sleep(50);
		});

		queue.add(async () => {});

		expect(queue.size).toBeGreaterThan(0);

		await sleep(60);
		expect(queue.size).toBe(0);
	});

	it("pauses execution", async () => {
		const queue = createQueue();
		queue.pause();

		const fn = vi.fn(async () => "ok");
		const promise = queue.add(fn);

		await sleep(20);
		expect(fn).not.toHaveBeenCalled();

		queue.start();
		await promise;

		expect(fn).toHaveBeenCalledOnce();
	});

	it("allows changing concurrency at runtime", async () => {
		const queue = createQueue({ concurrency: 1 });
		expect(queue.concurrency).toBe(1);

		queue.concurrency = 2;
		expect(queue.concurrency).toBe(2);
	});
});
