// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventMap = Record<PropertyKey, any[]>;

export interface EventEmitter<Events extends EventMap = EventMap> {
	on<K extends keyof Events>(eventName: K, handler: (...args: Events[K]) => void): this;
	once<K extends keyof Events>(eventName: K, handler: (...args: Events[K]) => void): this;
	off<K extends keyof Events>(eventName: K, handler?: (...args: Events[K]) => void): this;
	emit<K extends keyof Events>(eventName: K, ...args: Events[K]): this;
	removeAllListeners(): this;
}

export function createEventEmitter<Events extends EventMap = EventMap>(): EventEmitter<Events> {
	type Key = keyof Events;
	type Handler<K extends Key> = (...args: Events[K]) => void;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const listeners = new Map<Key, Set<Handler<any>>>();

	const emitter: EventEmitter<Events> = {
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

	function emit<K extends Key>(eventName: K, ...args: Events[K]) {
		const handlers = listeners.get(eventName);

		if (!handlers || !handlers.size) {
			if (eventName === "error") {
				const [error] = args;
				throw error instanceof Error ? error : new Error(String(error));
			}

			return emitter;
		}

		for (const handler of [...handlers]) {
			handler(...args);
		}

		return emitter;
	}

	return emitter;
}
