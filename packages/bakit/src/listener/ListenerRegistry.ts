import { Listener, ListenerConstructor } from "./Listener.js";
import { BakitClient } from "../BakitClient.js";
import {
	ErrorListenerHookMethod,
	EventsLike,
	ListenerEntry,
	ListenerHook,
	ListenerHookExecutionState,
	MainListenerHookMethod,
} from "./ListenerEntry.js";

import glob from "tiny-glob";
import { pathToFileURL } from "node:url";

/**
 * The global listener registry of Bakit.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class ListenerRegistry {
	private static client: BakitClient | undefined;

	public static constructors = new Set<ListenerConstructor>();

	public static instances = new WeakMap<ListenerConstructor, object>();

	public static executors = new WeakMap<
		InstanceType<ListenerConstructor>,
		(...args: unknown[]) => Promise<void>
	>();

	/**
	 * Add and register a listener to the registry.
	 * If `options.emitter` is not provided, the registry will use the base `client` by default.
	 * @param constructor The listener class you want to add.
	 */
	public static add(constructor: ListenerConstructor): void {
		const entry = Listener.getEntry(constructor);

		if (!entry) {
			throw new Error(`No entry found for "${constructor.name}"`);
		}

		const { options } = entry;

		if (!options.emitter) {
			if (!this.client) {
				throw new Error("Client is not ready.");
			}

			options.emitter = this.client;
		}

		const instance = new constructor();
		const executor = this.createExecutor(constructor, instance);

		this.constructors.add(constructor);
		this.instances.set(constructor, instance);
		this.executors.set(instance, executor);

		options.emitter[options.once ? "once" : "on"](options.name, (...args) => {
			void executor(...(args as unknown[]));
		});
	}

	/**
	 * Remove and unregister a listener from the registry.
	 * @param constructor The listener class you want to remove.
	 * @returns `boolean`, returns `true` if the listener is removed successfully.
	 */
	public static remove(constructor: ListenerConstructor): boolean {
		const entry = Listener.getEntry(constructor);

		if (!entry) {
			return false;
		}

		this.constructors.delete(constructor);

		const instance = this.instances.get(constructor);

		if (!instance) {
			return false;
		}

		this.instances.delete(constructor);

		const executor = this.executors.get(instance);

		if (!executor) {
			return false;
		}

		const { name, emitter } = entry.options;

		emitter?.removeListener(name, executor as never);
		this.executors.delete(instance);

		return true;
	}

	/**
	 * Remove and unregister all listeners from the registry.
	 * @returns Amount of removed listeners.
	 */
	public static removeAll(): number {
		let removedAmount = 0;

		for (const constructor of this.constructors) {
			if (this.remove(constructor)) {
				removedAmount++;
			}
		}

		return removedAmount;
	}

	/**
	 * Set base client for the registry to fallback as default emitter. This should be used only by BakitClient and stay untouched.
	 * @param newClient base client to set for the registry.
	 */
	private static setClient(newClient: BakitClient) {
		this.client = newClient;
	}

	private static createExecutor(
		constructor: ListenerConstructor,
		instance: InstanceType<ListenerConstructor>,
	) {
		const entry = Listener.getEntry(constructor);

		if (!entry) {
			throw new Error("Missing listener entry");
		}

		const hooks = ListenerEntry.getHooks(constructor).filter((hook) => hook.entry === entry);

		const hookGroup = this.makeHookGroup(hooks);

		return async function (...args: unknown[]) {
			if (!hookGroup.main) {
				return;
			}

			try {
				if (hookGroup.pre) {
					const preMethod = hookGroup.pre.method as MainListenerHookMethod<unknown[]>;
					await preMethod.call(instance, ...args);
				}

				await (hookGroup.main.method as MainListenerHookMethod<unknown[]>).call(instance, ...args);

				if (hookGroup.post) {
					const postMethod = hookGroup.post.method as MainListenerHookMethod<unknown[]>;
					await postMethod.call(instance, ...args);
				}
			} catch (error) {
				if (hookGroup.error) {
					const errorMethod = hookGroup.error.method as ErrorListenerHookMethod<unknown[]>;
					await errorMethod.call(instance, error, ...args);
				} else {
					throw error;
				}
			}
		};
	}

	private static makeHookGroup<E extends EventsLike, K extends keyof E>(
		hooks: ListenerHook<E, K>[],
	) {
		const hooksByType: Record<ListenerHookExecutionState, ListenerHook<E, K> | undefined> = {
			[ListenerHookExecutionState.Pre]: undefined,
			[ListenerHookExecutionState.Main]: undefined,
			[ListenerHookExecutionState.Post]: undefined,
			[ListenerHookExecutionState.Error]: undefined,
		};

		for (const hook of hooks) {
			hooksByType[hook.state] = hook;
		}

		return hooksByType;
	}

	/**
	 * Load and add all listeners which matched provided glob pattern to the registry.
	 * @param pattern glob pattern to load.
	 * @param parallel load all matched results in parallel, enabled by default.
	 * @returns All loaded listener constructors.
	 */
	public static async load(pattern: string, parallel = true): Promise<ListenerConstructor[]> {
		const files = await glob(pattern);

		const loaders = files.map(async (file) => {
			const fileURL = pathToFileURL(file).toString();

			const { default: constructor } = (await import(fileURL)) as {
				default: ListenerConstructor;
			};

			this.add(constructor);

			return constructor;
		});

		if (parallel) {
			return Promise.all(loaders);
		}

		const result: ListenerConstructor[] = [];

		for (const loader of loaders) {
			result.push(await loader);
		}

		return result;
	}
}
