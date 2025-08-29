import { SetOptional } from "type-fest";
import { EventKey, EventsLike, ListenerEntry, ListenerEntryOptions } from "./ListenerEntry.js";
import { ClientEvents } from "discord.js";

export type ListenerConstructor = new (...args: unknown[]) => object;

export type CreateListenerOptions<E extends EventsLike, K extends EventKey<E>> =
	| SetOptional<ListenerEntryOptions<E, K>, "once">
	| K;

export function ListenerFactory<
	E extends EventsLike = ClientEvents,
	K extends EventKey<E> = EventKey<E>,
>(options: CreateListenerOptions<E, K>) {
	if (typeof options !== "object") {
		options = {
			name: options,
			once: false,
		};
	}

	options.once = Boolean(options.once);

	return new ListenerEntry(options as ListenerEntryOptions<E, K>);
}

const ENTRY_KEY = Symbol("entry");

function use(listener: ListenerEntry<never, never>) {
	return (target: ListenerConstructor) => {
		Reflect.defineMetadata(ENTRY_KEY, listener, target);
	};
}

function getEntry(constructor: ListenerConstructor) {
	return Reflect.getMetadata(ENTRY_KEY, constructor) as ListenerEntry<never, never> | undefined;
}

export const Listener = Object.assign(ListenerFactory, {
	use,
	getEntry,
});
