import { type ClientEvent, Collection } from "@bakit/core";

import type { Bakit } from "#/Bakit";
import { type Dispose, Lifecycle, type LifecyclePlugin } from "#/lifecycle";

import type { AnyListener, AnyListenerHandler } from "./Listener";

export interface ListenerInvocation {
	event: ClientEvent;
	listener: AnyListener;
	args: readonly unknown[];
}

export interface ListenersLifecycle {
	invoke: [invocation: ListenerInvocation];
}

export type ListenerPlugin = LifecyclePlugin<ListenersLifecycle>;
export type ListenerPluginFactory = (bakit: Bakit) => ListenerPlugin;

export class ListenerRegistry {
	readonly client: Bakit;
	readonly lifecycle = new Lifecycle<ListenersLifecycle>();
	readonly listeners = new Collection<AnyListener, Dispose>();

	constructor(client: Bakit) {
		this.client = client;
	}

	subscribe(listener: AnyListener): Dispose {
		if (this.listeners.has(listener)) {
			throw new Error(`Listener (${listener.event}) is already subscribed`);
		}

		const handler = this.createHandler(listener);
		this.client.on(listener.event, handler);

		const dispose = () => this.client.off(listener.event, handler);
		this.listeners.set(listener, dispose);

		return dispose;
	}

	unsubscribeAll() {
		for (const [listener, dispose] of this.listeners.entries()) {
			dispose();
			this.listeners.delete(listener);
		}
	}

	createHandler(listener: AnyListener): AnyListenerHandler {
		return async (...args) => {
			const invocation: ListenerInvocation = {
				event: listener.event,
				listener,
				args,
			};

			await this.lifecycle.run("invoke", () => listener.execute(...(args as never)), invocation);
		};
	}
}
