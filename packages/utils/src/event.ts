// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventMap = Record<string, any[]>;
export type EventHandler<Events extends EventMap, K extends keyof Events> = (...args: Events[K]) => void;

export function createEventEmitter<Events extends EventMap = EventMap>() {
	type Key = keyof Events;
	type Handler<K extends Key> = EventHandler<Events, K>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listeners = new Map<Key, Set<Handler<any>>>();

	const emitter = {
		on,
		off,
		once,
		emit,
	};

	function createHandlers(eventName: Key) {
		let handlers = listeners.get(eventName);

		if (!handlers) {
			handlers = new Set();
			listeners.set(eventName, handlers);
		}

		return handlers;
	}

	function on<K extends Key>(eventName: K, handler: Handler<K>) {
		createHandlers(eventName).add(handler);
		return emitter;
	}

	function once<K extends Key>(eventName: K, handler: Handler<K>) {
		const wrapper: Handler<K> = (...args) => {
			handler(...args);
			off(eventName, wrapper);
		};

		createHandlers(eventName).add(wrapper);
		return emitter;
	}

	function off<K extends Key>(eventName: K, handler?: Handler<K>) {
		const handlers = listeners.get(eventName);

		if (!handlers) {
			return emitter;
		}

		if (handler) {
			handlers.delete(handler);
		} else {
			handlers.clear();
		}

		if (!handlers.size) {
			listeners.delete(eventName);
		}

		return emitter;
	}

	function emit<K extends Key>(eventName: K, ...args: Events[K]) {
		const handlers = listeners.get(eventName);

		if (!handlers) {
			return emitter;
		}

		for (const handler of handlers) {
			handler(...args);
		}

		return emitter;
	}

	return emitter;
}

export type EventEmitter<Events extends EventMap = EventMap> = ReturnType<typeof createEventEmitter<Events>>;
