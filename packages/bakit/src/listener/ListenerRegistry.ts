import { Listener } from "./Listener.js";
import { BakitClient } from "../BakitClient.js";
import { ErrorListenerHookMethod, MainListenerHookMethod } from "./ListenerEntry.js";

import { ConstructorLike, HookExecutionState } from "../base/BaseEntry.js";
import { StateBox } from "../libs/StateBox.js";

import glob from "tiny-glob";
import { pathToFileURL } from "node:url";

/**
 * The global listener registry of Bakit.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class ListenerRegistry {
	private static client: BakitClient | undefined;

	public static constructors = new Set<ConstructorLike>();

	public static instances = new WeakMap<ConstructorLike, object>();

	public static executors = new WeakMap<
		InstanceType<ConstructorLike>,
		(...args: unknown[]) => Promise<void>
	>();

	/**
	 * Add and register a listener to the registry.
	 * If `options.emitter` is not provided, the registry will use the base `client` by default.
	 * @param constructor The listener class you want to add.
	 */
	public static add(constructor: ConstructorLike): void {
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
	public static remove(constructor: ConstructorLike): boolean {
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
	protected static setClient(newClient: BakitClient) {
		this.client = newClient;
	}

	private static createExecutor(
		constructor: ConstructorLike,
		instance: InstanceType<ConstructorLike>,
	) {
		const entry = Listener.getEntry(constructor);

		if (!entry) {
			throw new Error("Missing listener entry");
		}

		const { hooks } = entry;

		const execute = async (...args: unknown[]) => {
			const mainHook = hooks[HookExecutionState.Main];
			const preHook = hooks[HookExecutionState.Pre];
			const postHook = hooks[HookExecutionState.Post];
			const errorHook = hooks[HookExecutionState.Error];

			if (!mainHook) {
				return;
			}

			try {
				if (preHook) {
					await (preHook.method as MainListenerHookMethod<unknown[]>).call(instance, ...args);
				}

				await (mainHook.method as MainListenerHookMethod<unknown[]>).call(instance, ...args);

				if (postHook) {
					await (postHook.method as MainListenerHookMethod<unknown[]>).call(instance, ...args);
				}
			} catch (error) {
				if (errorHook) {
					await (errorHook.method as ErrorListenerHookMethod<unknown[]>).call(
						instance,
						error,
						...args,
					);
				} else {
					throw error;
				}
			}
		};

		return async (...args: unknown[]) => {
			await StateBox.run(async () => {
				await execute(...args);
			});
		};
	}
	/**
	 * Load and add all listeners which matched provided glob pattern to the registry.
	 * @param pattern glob pattern to load.
	 * @param parallel load all matched results in parallel, enabled by default.
	 * @returns All loaded listener constructors.
	 */
	public static async load(pattern: string, parallel = true): Promise<ConstructorLike[]> {
		const files = await glob(pattern);

		const loaders = files.map(async (file) => {
			const fileURL = pathToFileURL(file).toString();

			const { default: constructor } = (await import(fileURL)) as {
				default: ConstructorLike;
			};

			this.add(constructor);

			return constructor;
		});

		if (parallel) {
			return Promise.all(loaders);
		}

		const result: ConstructorLike[] = [];

		for (const loader of loaders) {
			result.push(await loader);
		}

		return result;
	}
}
