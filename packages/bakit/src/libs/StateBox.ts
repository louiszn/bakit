import { AsyncLocalStorage } from "node:async_hooks";

export type States = Record<string | symbol, unknown>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StateBox {
	private static readonly STATES_KEY = Symbol("states");

	public static storage = new AsyncLocalStorage<States>();

	private static getState(): States {
		const state = this.storage.getStore();

		if (!state) {
			throw new Error("No active context, did you forget to wrap it with StateBox.wrap()?");
		}

		return state;
	}

	public static run<R>(fn: () => R, store = {}): R {
		return this.storage.run(store, fn);
	}

	public static wrap<R>(fn: () => R): () => R {
		const currentStore = this.storage.getStore();

		if (!currentStore) {
			throw new Error("No active context, cannot wrap function outside a StateBox.run()");
		}

		return () => this.run(fn, currentStore);
	}

	public static use<T extends object>(defaultValue?: unknown) {
		return (target: T, key: keyof T) => {
			Object.defineProperty(target, key, {
				get() {
					const states = StateBox.getState();

					if (!(key in states)) {
						states[key as string | symbol] = defaultValue;
					}

					return states[key as string | symbol];
				},
				set(value) {
					const states = StateBox.getState();
					states[key as string | symbol] = value;
				},
				enumerable: true,
				configurable: true,
			});
		};
	}
}
