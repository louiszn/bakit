import { Awaitable } from "discord.js";
import { ListenerConstructor } from "./Listener.js";
import EventEmitter from "node:events";

export type EventsLike = Record<keyof unknown, unknown[]>;

export type EventKey<E extends EventsLike> = keyof E;

export enum ListenerHookExecutionState {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

export type MainListenerHookMethod<E extends EventsLike, K extends EventKey<E>> = (
	...args: E[K] & unknown[]
) => Awaitable<void>;

export type ErrorListenerHookMethod<E extends EventsLike, K extends EventKey<E>> = (
	error: unknown,
	...args: E[K] & unknown[]
) => Awaitable<void>;

export interface MainListenerHook<E extends EventsLike, K extends EventKey<E>> {
	state:
		| ListenerHookExecutionState.Main
		| ListenerHookExecutionState.Post
		| ListenerHookExecutionState.Pre;
	method: MainListenerHookMethod<E, K>;
	entry: ListenerEntry<E, K>;
}

export interface ErrorListenerHook<E extends EventsLike, K extends EventKey<E>> {
	state: ListenerHookExecutionState.Error;
	method: ErrorListenerHookMethod<E, K>;
	entry: ListenerEntry<E, K>;
}

export type ListenerHook<E extends EventsLike, K extends EventKey<E>> =
	| MainListenerHook<E, K>
	| ErrorListenerHook<E, K>;

export interface ListenerEntryOptions<E extends EventsLike, K extends EventKey<E>> {
	name: K;
	once: boolean;
	emitter?: EventEmitter;
}

export const HOOKS_KEY = Symbol("hooks");

export class ListenerEntry<E extends EventsLike, K extends EventKey<E>> {
	private static cache = new WeakMap<ListenerConstructor, ListenerHook<never, never>[]>();

	public main = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Main, this);
	public pre = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Pre, this);
	public post = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Post, this);
	public error = ListenerEntry.createErrorHookDecorator(ListenerHookExecutionState.Error, this);

	public constructor(public options: ListenerEntryOptions<E, K>) {}

	public static getHooks<E extends EventsLike, K extends EventKey<E>>(
		constructor: ListenerConstructor,
	): readonly ListenerHook<E, K>[];
	public static getHooks<E extends EventsLike, K extends EventKey<E>>(
		constructor: ListenerConstructor,
		init: true,
	): ListenerHook<E, K>[];
	public static getHooks<E extends EventsLike, K extends EventKey<E>>(
		constructor: ListenerConstructor,
		init = false,
	): ListenerHook<E, K>[] | readonly ListenerHook<E, K>[] {
		let hooks =
			(this.cache.get(constructor) as ListenerHook<E, K>[] | undefined) ??
			(Reflect.getMetadata(HOOKS_KEY, constructor) as ListenerHook<E, K>[] | undefined);

		if (!hooks) {
			hooks = [];

			if (init) {
				Reflect.defineMetadata(HOOKS_KEY, hooks, constructor);
				this.cache.set(constructor, hooks as unknown as ListenerHook<never, never>[]);
			}
		}

		return init ? hooks : Object.freeze([...hooks]);
	}

	private static createMainHookDecorator<E extends EventsLike, K extends EventKey<E>>(
		state:
			| ListenerHookExecutionState.Main
			| ListenerHookExecutionState.Pre
			| ListenerHookExecutionState.Post,
		entry: ListenerEntry<E, K>,
	) {
		return <T extends MainListenerHookMethod<E, K>>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry);
		};
	}

	private static createErrorHookDecorator<E extends EventsLike, K extends EventKey<E>>(
		state: ListenerHookExecutionState.Error,
		entry: ListenerEntry<E, K>,
	) {
		return <T extends ErrorListenerHookMethod<E, K>>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry);
		};
	}

	private static addHook<E extends EventsLike, K extends EventKey<E>>(
		target: object,
		state: ListenerHookExecutionState,
		method: MainListenerHookMethod<E, K> | ErrorListenerHookMethod<E, K> | undefined,
		entry: ListenerEntry<E, K>,
	) {
		const { constructor } = target;
		const hooks = this.getHooks(constructor as ListenerConstructor, true);

		if (typeof method !== "function") {
			throw new Error("CommandEntry decorator must be used with a class method.");
		}

		if (hooks.some((hook) => hook.state === state && hook.entry === entry)) {
			throw new Error(
				`Hook "${state}" is already defined for entry "${String(entry.options.name)}".`,
			);
		}

		const hook: ListenerHook<E, K> = {
			state,
			entry,
			method: method as never,
		};

		hooks.push(hook as unknown as ListenerHook<never, never>);
	}
}
