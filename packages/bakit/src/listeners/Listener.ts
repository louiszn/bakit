import type { ClientEvent, ClientEvents } from "@bakit/core";
import type { Promisable } from "type-fest";

export type ListenerHandler<TEvent extends ClientEvent> = (
	...args: ClientEvents[TEvent]
) => Promisable<void>;

export interface ListenerOptions<TEvent extends ClientEvent> {
	event: TEvent;
	execute: ListenerHandler<TEvent>;
}

export type AnyListener = Listener<ClientEvent>;
export type AnyListenerHandler = ListenerHandler<ClientEvent>;

export class Listener<TEvent extends ClientEvent> {
	readonly event: TEvent;
	readonly execute: ListenerHandler<TEvent>;

	constructor(options: ListenerOptions<TEvent>) {
		this.event = options.event;
		this.execute = options.execute;
	}
}

export function useListener<TEvent extends ClientEvent>(
	options: ListenerOptions<TEvent>,
): Listener<TEvent> {
	return new Listener(options);
}
