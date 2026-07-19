import type { ClientEvent, ClientEvents } from "@bakit/core";
import type { Promisable } from "type-fest";

export type ListenerHook<TEvent extends ClientEvent> = (
	...args: ClientEvents[TEvent]
) => Promisable<void>;

export interface ListenerOptions<TEvent extends ClientEvent> {
	event: TEvent;

	onPre?: ListenerHook<TEvent>;
	onMain: ListenerHook<TEvent>;
	onPost?: ListenerHook<TEvent>;
}

export class Listener<TEvent extends ClientEvent> {
	readonly event: TEvent;

	readonly onPre?: ListenerHook<TEvent>;
	readonly onMain: ListenerHook<TEvent>;
	readonly onPost?: ListenerHook<TEvent>;

	constructor(options: ListenerOptions<TEvent>) {
		this.event = options.event;

		this.onPre = options.onPre;
		this.onMain = options.onMain;
		this.onPost = options.onPost;
	}
}

export function useListener<TEvent extends ClientEvent>(
	options: ListenerOptions<TEvent>,
): Listener<TEvent> {
	return new Listener(options);
}
