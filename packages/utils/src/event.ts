// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventMap = Record<PropertyKey, any[]>;
export type EventHandler<Events extends EventMap, K extends keyof Events> = (...args: Events[K]) => void;

export function createEventEmitter<Events extends object = EventMap>() {
	type Key = keyof Events;
	type IndexedEvents = Events & EventMap;
	type Handler<K extends Key> = EventHandler<IndexedEvents, K>;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listeners = new Map<Key, Set<Handler<any>>>();

	const emitter = {
		on,
		off,
		once,
		emit,
		removeAllListeners,
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

	function removeAllListeners() {
		listeners.clear();
		return emitter;
	}

	function emit<K extends Key>(eventName: K, ...args: IndexedEvents[K]) {
		const handlers = listeners.get(eventName);

		if (!handlers || !handlers.size) {
			if (eventName === "error") {
				const [error] = args;
				throw error instanceof Error ? error : new Error(error);
			}

			return emitter;
		}

		for (const handler of handlers) {
			handler(...args);
		}

		return emitter;
	}

	return emitter;
}

export type EventEmitter<Events extends object = EventMap> = ReturnType<typeof createEventEmitter<Events>>;
