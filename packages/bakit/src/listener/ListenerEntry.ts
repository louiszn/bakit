import {
	BaseEntry,
	BaseErrorHookMethod,
	BaseHook,
	BaseMainHookMethod,
	ConstructorLike,
} from "../base/BaseEntry.js";

import EventEmitter from "node:events";

export type EventsLike = Record<keyof unknown, unknown[]>;

export type MainListenerHookMethod<Args extends unknown[]> = BaseMainHookMethod<Args>;
export type ErrorListenerHookMethod<Args extends unknown[]> = BaseErrorHookMethod<Args>;

export interface ListenerHook<E extends EventsLike, K extends keyof E> extends BaseHook {
	method: MainListenerHookMethod<E[K] & unknown[]> | ErrorListenerHookMethod<E[K] & unknown[]>;
}

export interface ListenerEntryOptions<E extends EventsLike, K extends keyof E> {
	name: K;
	once: boolean;
	emitter?: EventEmitter;
}

export class ListenerEntry<E extends EventsLike, K extends keyof E> extends BaseEntry<
	ConstructorLike,
	ListenerHook<E, K>,
	MainListenerHookMethod<E[K] & unknown[]>,
	ErrorListenerHookMethod<E[K] & unknown[]>
> {
	public constructor(public options: ListenerEntryOptions<E, K>) {
		super();
	}
}
