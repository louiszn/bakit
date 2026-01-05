import PQueue, { type Options, type QueueAddOptions } from "p-queue";
import type { FunctionLike } from "./types/index.js";

/**
 * A p-queue wrapper to be used globally.
 */
export interface Queue {
	add<T>(fn: FunctionLike<[], PromiseLike<T>>, options?: Partial<QueueAddOptions>): Promise<T>;
	pause(): void;
	start(): PQueue;
	readonly size: number;
}

/**
 * Create a new queue.
 */
export function createQueue(options: Options<never, never>): Queue {
	const queue = new PQueue();

	return {
		add(fn) {
			return queue.add(fn, options);
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
	};
}
