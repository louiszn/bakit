import { Awaitable } from "discord.js";
import { ListenerConstructor } from "./Listener.js";
import EventEmitter from "node:events";

export type EventsLike = Record<keyof unknown, unknown[]>;

export enum ListenerHookExecutionState {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

export type MainListenerHookMethod<Args extends unknown[]> = (...args: Args) => Awaitable<void>;
export type ErrorListenerHookMethod<Args extends unknown[]> = (
	error: unknown,
	...args: Args
) => Awaitable<void>;

export interface ListenerHook<E extends EventsLike, K extends keyof E> {
	state: ListenerHookExecutionState;
	method: MainListenerHookMethod<E[K] & unknown[]> | ErrorListenerHookMethod<E[K] & unknown[]>;
	entry: ListenerEntry<E, K>;
}

export interface ListenerEntryOptions<E extends EventsLike, K extends keyof E> {
	name: K;
	once: boolean;
	emitter?: EventEmitter;
}

export class ListenerEntry<E extends EventsLike, K extends keyof E> {
	public static hooksKey = Symbol("hooks");

	private static cache = new WeakMap<
		ListenerConstructor,
		ListenerHook<EventsLike, keyof EventsLike>[]
	>();

	public main = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Main, this);
	public pre = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Pre, this);
	public post = ListenerEntry.createMainHookDecorator(ListenerHookExecutionState.Post, this);
	public error = ListenerEntry.createErrorHookDecorator(ListenerHookExecutionState.Error, this);

	public constructor(public options: ListenerEntryOptions<E, K>) {}

	public static getHooks<E extends EventsLike, K extends keyof E>(
		constructor: ListenerConstructor,
		init = false,
	): ListenerHook<E, K>[] {
		const { cache } = this;

		let hooks =
			(cache.get(constructor) as ListenerHook<E, K>[] | undefined) ??
			(Reflect.getMetadata(this.hooksKey, constructor) as ListenerHook<E, K>[] | undefined);

		if (!hooks) {
			hooks = [];

			if (init) {
				Reflect.defineMetadata(this.hooksKey, hooks, constructor);

				this.cache.set(
					constructor,
					hooks as unknown as ListenerHook<EventsLike, keyof EventsLike>[],
				);
			}
		}

		return init ? hooks : [...hooks];
	}

	private static createMainHookDecorator<E extends EventsLike, K extends keyof E>(
		state:
			| ListenerHookExecutionState.Main
			| ListenerHookExecutionState.Pre
			| ListenerHookExecutionState.Post,
		entry: ListenerEntry<E, K>,
	) {
		return <T extends MainListenerHookMethod<E[K] & unknown[]>>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry);
		};
	}

	private static createErrorHookDecorator<E extends EventsLike, K extends keyof E>(
		state: ListenerHookExecutionState.Error,
		entry: ListenerEntry<E, K>,
	) {
		return <T extends ErrorListenerHookMethod<E[K] & unknown[]>>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry);
		};
	}

	private static addHook<E extends EventsLike, K extends keyof E>(
		target: object,
		state: ListenerHookExecutionState,
		method:
			| MainListenerHookMethod<E[K] & unknown[]>
			| ErrorListenerHookMethod<E[K] & unknown[]>
			| undefined,
		entry: ListenerEntry<E, K>,
	) {
		const { constructor } = target;
		const hooks = this.getHooks<E, K>(constructor as ListenerConstructor, true);

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

		hooks.push(hook);
	}
}
