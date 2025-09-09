import { ClientEvents } from "discord.js";
import { EventsLike, ListenerEntry, ListenerEntryOptions } from "./ListenerEntry.js";
import { SetOptional } from "type-fest";
import { ConstructorLike } from "../base/BaseEntry.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListenerAPI {
	const entries = new WeakMap<ConstructorLike, ListenerEntry<EventsLike, keyof EventsLike>>();

	export function use<E extends EventsLike, K extends keyof E>(entry: ListenerEntry<E, K>) {
		return (target: ConstructorLike) => {
			entries.set(target, entry as ListenerEntry<EventsLike, keyof EventsLike>);
		};
	}

	export function getEntry<E extends EventsLike, K extends keyof E>(target: ConstructorLike) {
		return entries.get(target) as ListenerEntry<E, K> | undefined;
	}
}

export function ListenerFactory<E extends EventsLike = ClientEvents, K extends keyof E = keyof E>(
	options: SetOptional<ListenerEntryOptions<E, K>, "once"> | K,
) {
	const fullOptions: ListenerEntryOptions<E, K> =
		typeof options !== "object" ? { name: options, once: false } : { once: false, ...options };

	return new ListenerEntry(fullOptions);
}

export const Listener = Object.assign(ListenerFactory, ListenerAPI);
