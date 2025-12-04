import { type Awaitable, Collection } from "discord.js";
import { Context } from "./Context.js";

export enum HookState {
	Pre = "PRE",
	Main = "MAIN",
	Post = "POST",
	Error = "ERROR",
}

export enum HookOrder {
	First,
	Last,
}

export type MainHookCallback<C extends Context, Args extends unknown[]> = (
	context: C,
	...args: Args
) => Awaitable<void>;

export type ErrorHookCallback<C extends Context, Args extends unknown[]> = (
	context: C,
	error: unknown,
	...args: Args
) => Awaitable<void>;

export class LifecycleManager<C extends Context, Args extends unknown[]> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	private readonly hooks: Record<HookState, Collection<string, Function>> = {
		[HookState.Main]: new Collection(),
		[HookState.Pre]: new Collection(),
		[HookState.Post]: new Collection(),
		[HookState.Error]: new Collection(),
	};

	public constructor(public id: string) {}

	public getName(name: string) {
		return `${this.id}:${name}`;
	}

	public setHook(name: string, state: HookState.Post, callback: MainHookCallback<C, Args>, order?: HookOrder): this;
	public setHook(name: string, state: HookState.Main, callback: MainHookCallback<C, Args>, order?: HookOrder): this;
	public setHook(name: string, state: HookState.Pre, callback: MainHookCallback<C, Args>, order?: HookOrder): this;
	public setHook(name: string, state: HookState.Error, callback: ErrorHookCallback<C, Args>, order?: HookOrder): this;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public setHook(name: string, state: HookState, callback: Function, order = HookOrder.Last): this {
		const currentHooks = this.hooks[state];
		const key = this.getName(name);

		if (currentHooks.has(key)) {
			console.warn(`Overriding duplicate hook '${key}' for state '${state}'`);
		}

		if (order === HookOrder.Last) {
			currentHooks.set(key, callback);
		} else {
			const existingEntries = [...currentHooks.entries()].filter(([k]) => k !== key);

			currentHooks.clear();
			currentHooks.set(key, callback);

			for (const [k, v] of existingEntries) {
				currentHooks.set(k, v);
			}
		}

		return this;
	}

	public main(callback: MainHookCallback<C, Args>) {
		return this.setHook("main", HookState.Main, callback);
	}

	public pre(callback: MainHookCallback<C, Args>) {
		return this.setHook("pre", HookState.Pre, callback);
	}

	public post(callback: MainHookCallback<C, Args>) {
		return this.setHook("post", HookState.Post, callback);
	}

	public error(callback: ErrorHookCallback<C, Args>) {
		return this.setHook("error", HookState.Error, callback);
	}

	public async execute(context: C, ...args: Args) {
		const pipeline = [
			...this.hooks[HookState.Pre].values(),
			...this.hooks[HookState.Main].values(),
			...this.hooks[HookState.Post].values(),
		];

		let error: unknown | undefined;

		for (const hook of pipeline) {
			if (context.canceled) {
				break;
			}

			try {
				await (hook as MainHookCallback<C, Args>)(context, ...args);
			} catch (e) {
				error = e;
				break; // cancel the main hooks
			}
		}

		if (!error) {
			return;
		}

		const errorHooks = this.hooks[HookState.Error];

		// Throw the error directly instead of failing silently
		if (!errorHooks.size) {
			throw error;
		}

		for (const [key, callback] of this.hooks[HookState.Error].entries()) {
			if (context.canceled) {
				break;
			}

			try {
				await (callback as ErrorHookCallback<C, Args>)(context, error, ...args);
			} catch (innerError) {
				console.error(`[Lifecycle] Error handler for '${key}' failed:`, innerError);
			}
		}
	}
}
