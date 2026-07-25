import type { Promisable } from "type-fest";

import { Context } from "./Context";

type LifecycleSpec<T> = {
	[THook in keyof T]: unknown[];
};

export type LifecycleHook<
	TLifecycle extends LifecycleSpec<TLifecycle>,
	THook extends keyof TLifecycle,
> = (context: Context<THook>, ...args: TLifecycle[THook]) => Promisable<void>;

export type LifecycleErrorHook<
	TLifecycle extends LifecycleSpec<TLifecycle>,
	THook extends keyof TLifecycle,
> = (context: Context<THook>, error: unknown, ...args: TLifecycle[THook]) => Promisable<void>;

export interface LifecycleHooks<
	TLifecycle extends LifecycleSpec<TLifecycle>,
	THook extends keyof TLifecycle,
> {
	onPre?: LifecycleHook<TLifecycle, THook>;
	onMain?: LifecycleHook<TLifecycle, THook>;
	onPost?: LifecycleHook<TLifecycle, THook>;
	onError?: LifecycleErrorHook<TLifecycle, THook>;
}

export type LifecyclePlugin<TLifecycle extends LifecycleSpec<TLifecycle>> = {
	[THook in keyof TLifecycle]?: LifecycleHooks<TLifecycle, THook>;
};

export type Dispose = () => void;

export class Lifecycle<TLifecycle extends LifecycleSpec<TLifecycle>> {
	readonly #plugins: LifecyclePlugin<TLifecycle>[] = [];

	use(plugin: LifecyclePlugin<TLifecycle>): Dispose {
		this.#plugins.push(plugin);

		return () => {
			const index = this.#plugins.indexOf(plugin);

			if (index !== -1) {
				this.#plugins.splice(index, 1);
			}
		};
	}

	async run<THook extends keyof TLifecycle>(
		hook: THook,
		target: LifecycleHook<TLifecycle, THook>,
		...args: TLifecycle[THook]
	): Promise<Context<THook>> {
		const context = new Context(hook);
		const entered: LifecycleHooks<TLifecycle, THook>[] = [];

		try {
			for (const plugin of this.#plugins) {
				const handlers = plugin[hook];

				if (!handlers) {
					continue;
				}

				entered.push(handlers);

				await handlers.onPre?.(context, ...args);

				if (context.cancelled) {
					return context;
				}
			}

			for (const handlers of entered) {
				await handlers.onMain?.(context, ...args);

				if (context.cancelled) {
					return context;
				}
			}

			await target(context, ...args);

			return context;
		} catch (error) {
			const hookErrors: unknown[] = [];

			for (const handlers of entered.toReversed()) {
				try {
					await handlers.onError?.(context, error, ...args);
				} catch (hookError) {
					hookErrors.push(hookError);
				}
			}

			if (hookErrors.length > 0) {
				throw new AggregateError(
					[error, ...hookErrors],
					`Errors occurred while handling lifecycle "${String(hook)}"`,
				);
			}

			throw error;
		} finally {
			for (const handlers of entered.toReversed()) {
				await handlers.onPost?.(context, ...args);
			}
		}
	}
}
