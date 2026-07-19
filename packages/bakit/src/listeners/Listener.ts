import type { Client, ClientEvent, ClientEvents } from "@bakit/core";
import type { Promisable } from "type-fest";

export type ListenerHook<TEvent extends ClientEvent> = (
	...args: ClientEvents[TEvent]
) => Promisable<void>;

export interface ListenerPlugin<TEvent extends ClientEvent> {
	onPre?: ListenerHook<TEvent>;
	onPost?: ListenerHook<TEvent>;
}

export interface ListenerOptions<TEvent extends ClientEvent> {
	event: TEvent;

	plugins?: readonly ListenerPlugin<TEvent>[];

	onPre?: ListenerHook<TEvent>;
	onMain: ListenerHook<TEvent>;
	onPost?: ListenerHook<TEvent>;
}

export class Listener<TEvent extends ClientEvent> {
	readonly event: TEvent;
	readonly plugins: readonly ListenerPlugin<TEvent>[];

	readonly onPre?: ListenerHook<TEvent>;
	readonly onMain: ListenerHook<TEvent>;
	readonly onPost?: ListenerHook<TEvent>;

	readonly #handler: ListenerHook<TEvent>;

	constructor(options: ListenerOptions<TEvent>) {
		this.event = options.event;
		this.plugins = options.plugins ?? [];

		this.onPre = options.onPre;
		this.onMain = options.onMain;
		this.onPost = options.onPost;

		this.#handler = (...args) => this.run(...args);
	}

	async run(...args: ClientEvents[TEvent]): Promise<void> {
		for (const plugin of this.plugins) {
			await plugin.onPre?.(...args);
		}

		await this.onPre?.(...args);
		await this.onMain(...args);
		await this.onPost?.(...args);

		for (const plugin of this.plugins.toReversed()) {
			await plugin.onPost?.(...args);
		}
	}

	attach(client: Client): void {
		client.on(this.event, this.#handler as never);
	}

	detach(client: Client): void {
		client.off(this.event, this.#handler as never);
	}
}

export function useListener<TEvent extends ClientEvent>(
	options: ListenerOptions<TEvent>,
): Listener<TEvent> {
	return new Listener(options);
}
