import { SetOptional } from "type-fest";
import { EventsLike, ListenerEntry, ListenerEntryOptions } from "./ListenerEntry.js";
import { ClientEvents } from "discord.js";

export type ListenerConstructor = new (...args: unknown[]) => object;

export type CreateListenerOptions<E extends EventsLike, K extends keyof E> =
	| SetOptional<ListenerEntryOptions<E, K>, "once">
	| K;

export function ListenerFactory<E extends EventsLike = ClientEvents, K extends keyof E = keyof E>(
	options: CreateListenerOptions<E, K>,
) {
	const normalizedOptions: ListenerEntryOptions<E, K> =
		typeof options === "object" ? { once: false, ...options } : { name: options, once: false };

	return new ListenerEntry(normalizedOptions);
}

export const LISTENER_ENTRY_KEY = Symbol("entry");

function use<E extends EventsLike = ClientEvents>(listener: ListenerEntry<E, keyof E>) {
	return (target: ListenerConstructor) => {
		Reflect.defineMetadata(LISTENER_ENTRY_KEY, listener, target);
	};
}

function getEntry<E extends EventsLike = ClientEvents, K extends keyof E = keyof E>(
	constructor: ListenerConstructor,
) {
	return Reflect.getMetadata(LISTENER_ENTRY_KEY, constructor) as ListenerEntry<E, K> | undefined;
}

export const Listener = Object.assign(ListenerFactory, {
	use,
	getEntry,
});
