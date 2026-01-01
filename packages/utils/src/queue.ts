import type { Awaitable, RejectFn, ResolveFn } from "./types/index.js";

export interface QueueOptions {
	concurrency?: number;
}

export type TaskCallback = () => Awaitable<void>;

export function createQueue(options: QueueOptions = {}) {
	const { concurrency = 1 } = options;

	const list: Task[] = [];

	let running = 0;

	function start(): void {
		if (running >= concurrency || !list.length) {
			return;
		}

		const current = list.shift();

		if (!current) {
			return;
		}

		running++;
		executeTask(current);
	}

	async function executeTask(task: Task): Promise<void> {
		try {
			if (task.signal.aborted) {
				task.reject(task.signal.reason);
				return;
			}

			await task.callback();
			task.resolve(task);
		} catch (error) {
			task.reject(error);
		} finally {
			running--;
			start();
		}
	}

	function enqueue(task: Task | TaskCallback, startAfter = true): Task {
		if (typeof task === "function") {
			task = createTask(task, queue);
		}

		list.push(task);

		if (startAfter) {
			start();
		}

		return task;
	}

	function dequeue(task: Task | TaskCallback): Task {
		let resolved: Task | undefined;

		if (typeof task === "function") {
			resolved = list.find((t) => t.callback === task);
		} else {
			resolved = task;
		}

		if (!resolved) {
			throw new Error("Unknown task");
		}

		resolved.cancel();
		return resolved;
	}

	function remove(task: Task): boolean {
		const index = list.indexOf(task);
		if (index === -1) {
			return false;
		}

		list.splice(index, 1);
		return true;
	}

	function clear() {
		const remaining = [...list];
		list.length = 0;

		for (const task of remaining) {
			task.cancel();
		}
	}

	const queue = {
		enqueue,
		dequeue,
		start,
		remove,
		clear,
	};

	return queue;
}
export type Queue = ReturnType<typeof createQueue>;

export function createTask(callback: TaskCallback, queue: Queue) {
	const controller = new AbortController();

	let settled = false;

	let resolve!: ResolveFn;
	let reject!: RejectFn;

	const promise = new Promise<unknown>((res, rej) => {
		resolve = (value) => {
			if (!settled) {
				settled = true;
				res(value);
			}
		};
		reject = (reason) => {
			if (!settled) {
				settled = true;
				rej(reason);
			}
		};
	});

	function cancel(reason?: unknown) {
		controller.abort(reason ?? new Error("Task cancelled"));
		queue.remove(task);
		reject(controller.signal.reason);
	}

	const task = {
		queue,
		signal: controller.signal,
		promise,
		callback,
		resolve,
		reject,
		cancel,
	};

	return task;
}
export type Task = ReturnType<typeof createTask>;
