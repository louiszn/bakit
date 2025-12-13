import { Collection, GatewayIntentBits, IntentsBitField } from "discord.js";

import { posix } from "path";
import glob from "tiny-glob";

import { Listener } from "../structures/Listener.js";
import { BaseClientManager } from "./BaseClientManager.js";
import { Context } from "../context/Context.js";

import { EVENT_INTENT_MAPPING } from "../../lib/discord/EventIntents.js";

export class ListenerManager extends BaseClientManager {
	public listeners: Listener[] = [];
	public entries = new Collection<string, Listener>();
	private executors = new WeakMap<Listener, (...args: unknown[]) => void>();

	public async loadModules(entryDir: string): Promise<Listener[]> {
		const pattern = posix.join(posix.resolve(entryDir), "listeners", "**/*.{ts,js}");
		const files = await glob(pattern, { cwd: process.cwd() });

		const results = await Promise.all(files.map((file) => this.load(file)));
		const filtered = results.filter((l): l is Listener => !!l);

		console.log(`[Loader] Loaded ${filtered.length}/${files.length} listener(s)`);

		return filtered;
	}

	/**
	 * Load the file and add the listener to the registry.
	 * @param path The path to the listener file.
	 * @returns The listener object if added successfully.
	 */
	public async load(path: string): Promise<Listener | undefined> {
		const listener = (await import(path)).default as Listener;

		if (!listener) {
			console.warn(`[Loader] File has no default export: ${path}`);
			return;
		}

		if (!(listener instanceof Listener)) {
			console.warn(`[Loader] Default export is not a Listener: ${path}`);
			return;
		}

		this.add(listener);
		this.entries.set(path, listener);

		return listener;
	}

	/**
	 * Unload the file and remove the listener from the registry.
	 * @param path The path to the listener file.
	 * @returns The listener object if unloaded successfully.
	 */
	public async unload(path: string): Promise<Listener | undefined> {
		const listener = this.entries.get(path);
		this.entries.delete(path);

		const loader = await import("bakit/loader/register");
		loader.unload(path);

		if (!listener) {
			return;
		}

		return this.remove(listener)?.[0];
	}

	public async reload(path: string) {
		await this.unload(path);
		const listener = await this.load(path);

		if (!listener) {
			return;
		}

		console.log(`[Loader] Reloaded listener '${listener.options.name}' at '${path}'`);

		return listener;
	}

	/**
	 * Add a listener to the registry and create a listener for client.
	 * @param listener Listener to add.
	 */
	public add(listener: Listener): void {
		if (!(listener instanceof Listener)) {
			throw new Error("Invalid listener provided");
		}

		const { once, name } = listener.options;
		const execute = (...args: unknown[]) => {
			void listener.execute(new Context(), ...(args as never));
		};

		this.listeners.push(listener);
		this.executors.set(listener, execute);
		this.client[once ? "once" : "on"](name, execute);
	}

	/**
	 * Remove a listener from the registry and client.
	 * @param target Listener name or object to remove.
	 * @returns The list of listener objects if removed successfully.
	 */
	public remove(target: string | Listener): Listener[] {
		const isMatched = (listener: Listener) => {
			if (typeof target === "string") {
				return listener.options.name === target;
			}

			return listener === target;
		};

		const removed: Listener[] = [];

		this.listeners = this.listeners.filter((listener) => {
			if (!isMatched(listener)) {
				return true;
			}

			removed.push(listener);

			const execute = this.executors.get(listener);

			if (execute) {
				this.client.removeListener(listener.options.name, execute);
				this.executors.delete(listener);
			}

			return false;
		});

		return removed;
	}

	/**
	 * Get a list of required intents for Bakit to run correctly.
	 * @returns Used intents.
	 */
	public getBaseIntents() {
		return new IntentsBitField([GatewayIntentBits.Guilds]);
	}

	/**
	 * Get a list of needed intents based on registered listeners to receive needed events.
	 * @returns Used intents.
	 */
	public getNeededIntents() {
		const result = this.getBaseIntents();

		for (const listener of this.listeners) {
			const eventName = listener.options.name;
			const requiredIntents = EVENT_INTENT_MAPPING[eventName];

			if (requiredIntents) {
				result.add(requiredIntents);
			}
		}

		return result;
	}
}
