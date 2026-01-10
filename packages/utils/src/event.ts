import { Collection } from "@discordjs/collection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventMap = Record<PropertyKey, any[]>;

type IndexableEventMap<T extends object = EventMap> = T & EventMap;
type ArgsOf<Events extends object, K extends keyof Events> = IndexableEventMap<Events>[K];
type ListenerHandler<Events extends object, K extends keyof Events> = (...args: ArgsOf<Events, K>) => void;

export interface EventBus<Events extends object = EventMap> {
	on<K extends keyof Events>(eventName: K, handler: ListenerHandler<Events, K>): this;
	once<K extends keyof Events>(eventName: K, handler: ListenerHandler<Events, K>): this;
	off<K extends keyof Events>(eventName: K, handler?: ListenerHandler<Events, K>): this;
	emit<K extends keyof Events>(eventName: K, ...args: ArgsOf<Events, K>): this;
	removeAllListeners(eventName?: keyof Events): this;
}

export interface EventListener {
	type: "once" | "on";
	handler: ListenerHandler<object, keyof object>;
}

export function createEventBus<Events extends object = EventMap>(): EventBus<Events> {
	type EventKey = keyof Events;

	const events = new Collection<EventKey, Set<EventListener>>();

	const self: EventBus<Events> = {
		on,
		once,
		off,
		emit,
		removeAllListeners,
	};

	function addListener(type: "on" | "once", eventName: EventKey, handler: ListenerHandler<object, keyof object>) {
		let listeners = events.get(eventName);

		if (!listeners) {
			listeners = new Set();
			events.set(eventName, listeners);
		}

		listeners.add({
			type,
			handler,
		});

		return self;
	}

	function on<K extends EventKey>(eventName: K, handler: ListenerHandler<Events, K>) {
		return addListener("on", eventName, handler);
	}

	function once<K extends EventKey>(eventName: K, handler: ListenerHandler<Events, K>) {
		return addListener("once", eventName, handler);
	}

	function off<K extends EventKey>(eventName: K, handler?: ListenerHandler<Events, K>) {
		if (!handler) {
			return removeAllListeners(eventName);
		}

		const listeners = events.get(eventName);

		if (!listeners) {
			return self;
		}

		for (const listener of [...listeners]) {
			if (listener.handler === handler) {
				listeners.delete(listener);
			}
		}

		if (listeners.size === 0) {
			events.delete(eventName);
		}

		return self;
	}

	function removeAllListeners(eventName?: EventKey) {
		if (!eventName) {
			events.clear();
			return self;
		}

		const listeners = events.get(eventName);

		if (listeners) {
			listeners.clear();
			events.delete(eventName);
		}

		return self;
	}

	function emit<K extends keyof Events>(eventName: K, ...args: ArgsOf<Events, K>) {
		const listeners = events.get(eventName);

		if (!listeners || listeners.size === 0) {
			if (eventName === "error") {
				const error = args[0];
				throw error instanceof Error ? error : new Error(String(error));
			}
			return self;
		}

		for (const listener of [...listeners]) {
			listener.handler(...args);

			if (listener.type === "once") {
				listeners.delete(listener);
			}
		}

		return self;
	}

	return self;
}

export function attachEventBus<T extends object, Events extends object = EventMap>(
	base: T,
	bus: EventBus<Events> = createEventBus(),
): T & EventBus<Events> {
	return Object.assign(base, {
		on<K extends keyof Events>(event: K, handler: ListenerHandler<Events, K>) {
			bus.on(event, handler);
			return base as EventBus;
		},
		once<K extends keyof Events>(event: K, handler: ListenerHandler<Events, K>) {
			bus.once(event, handler);
			return base as EventBus;
		},
		off<K extends keyof Events>(event: K, handler?: ListenerHandler<Events, K>) {
			bus.off(event, handler);
			return base as EventBus;
		},
		emit<K extends keyof Events>(event: K, ...args: ArgsOf<Events, K>) {
			bus.emit(event, ...args);
			return base as EventBus;
		},
		removeAllListeners(event?: keyof Events) {
			bus.removeAllListeners(event);
			return base as EventBus;
		},
	});
}
