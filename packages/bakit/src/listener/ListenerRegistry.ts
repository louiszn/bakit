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

let client: BakitClient | undefined;

const constructors = new Set<ListenerConstructor>();

const instances = new WeakMap<ListenerConstructor, object>();

const executors = new WeakMap<
	InstanceType<ListenerConstructor>,
	(...args: unknown[]) => Promise<void>
>();

function add(constructor: ListenerConstructor) {
	const entry = Listener.getEntry(constructor);

	if (!entry) {
		throw new Error(`No entry found for "${constructor.name}"`);
	}

	const { options } = entry;

	if (!options.emitter) {
		if (!client) {
			throw new Error("Client is not ready.");
		}

		options.emitter = client;
	}

	const instance = new constructor();

	constructors.add(constructor);
	instances.set(constructor, instance);

	const executor = createExecutor(constructor, instance);

	executors.set(instance, executor);

	options.emitter[options.once ? "once" : "on"](options.name, (...args) => {
		void executor(...(args as unknown[]));
	});
}

function remove(constructor: ListenerConstructor) {
	const entry = Listener.getEntry(constructor);

	if (!entry) {
		return;
	}

	constructors.delete(constructor);

	const instance = instances.get(constructor);

	if (!instance) {
		return;
	}

	instances.delete(constructor);

	const executor = executors.get(instance);

	if (!executor) {
		return;
	}

	const { name, emitter } = entry.options;
	emitter?.removeListener(name, executor as never);
	executors.delete(instance);
}

function removeAll() {
	for (const constructor of constructors) {
		remove(constructor);
	}
}

function setClient(newClient: BakitClient) {
	client = newClient;
}

function createExecutor(
	constructor: ListenerConstructor,
	instance: InstanceType<ListenerConstructor>,
) {
	const entry = Listener.getEntry(constructor);

	if (!entry) {
		throw new Error("Missing listener entry");
	}

	const hooks = ListenerEntry.getHooks(constructor).filter((hook) => hook.entry === entry);

	const hookGroup = makeHookGroup(hooks);

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

function makeHookGroup<E extends EventsLike, K extends keyof E>(hooks: ListenerHook<E, K>[]) {
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

export const ListenerRegistry = {
	constructors,
	instances,
	executors,
	add,
	setClient,
	remove,
	removeAll,
};
