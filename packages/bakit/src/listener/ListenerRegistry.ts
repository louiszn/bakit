import { Listener, ListenerConstructor } from "./Listener.js";
import { BakitClient } from "../BakitClient.js";
import { ListenerEntry } from "./ListenerEntry.js";

let client: BakitClient | undefined;

const constructors = new Set<ListenerConstructor>();
const instances = new WeakMap<ListenerConstructor, object>();

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

	constructors.add(constructor);
	instances.set(constructor, new constructor());
}

function remove(constructor: ListenerConstructor) {
	const entry = Listener.getEntry(constructor);

	if (!entry) {
		return;
	}

	constructors.delete(constructor);
	instances.delete(constructor);

	const hook = ListenerEntry.getHooks(constructor).find((hook) => hook.entry === entry);

	if (!hook) {
		return;
	}

	const { name, emitter } = entry.options;

	emitter?.removeListener(name, hook.method as never);
}

function removeAll() {
	for (const constructor of constructors) {
		remove(constructor);
	}
}

function setClient(newClient: BakitClient) {
	client = newClient;
}

export const ListenerRegistry = {
	constructors,
	instances,
	add,
	setClient,
	remove,
	removeAll,
};
