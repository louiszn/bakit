import PQueue, { type Options, type QueueAddOptions } from "p-queue";
import type { FunctionLike } from "./types/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueueOptions = Options<any, any>;

/**
 * A p-queue wrapper to be used globally.
 */
export interface Queue {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	add<T>(fn: FunctionLike<any[], PromiseLike<T>>, options?: Partial<QueueAddOptions>): Promise<T>;
	pause(): void;
	start(): PQueue;

	concurrency: number;
	readonly size: number;
}

/**
 * Create a new queue.
 */
export function createQueue(options?: QueueOptions): Queue {
	const queue = new PQueue(options);

	return {
		add(fn, opts) {
			return queue.add(fn, opts);
		},
		pause() {
			queue.pause();
		},
		start() {
			return queue.start();
		},
		get size() {
			return queue.size;
		},
		set concurrency(value: number) {
			queue.concurrency = value;
		},
		get concurrency() {
			return queue.concurrency;
		},
	};
}
