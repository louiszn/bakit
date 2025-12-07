import { posix } from "path";
import glob from "tiny-glob";

import { Listener } from "./Listener.js";
import { BaseClientManager } from "../base/index.js";
import { getConfig } from "../config.js";
import { Context } from "../base/lifecycle/Context.js";
import { GatewayIntentBits, IntentsBitField } from "discord.js";
import { EVENT_INTENT_MAPPING } from "../utils/EventIntents.js";
import { $jiti } from "../utils/index.js";

export class ListenerManager extends BaseClientManager {
	public listeners: Listener[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private executors = new WeakMap<Listener, (...args: any[]) => void>();

	public async loadModules(): Promise<Listener[]> {
		const entryDir = posix.resolve(getConfig().entryDir);
		const pattern = posix.join(entryDir, "listeners", "**/*.{ts,js}");

		const files = await glob(pattern, {
			cwd: process.cwd(),
		});

		const loads = files.map(async (file) => {
			try {
				const listener = await $jiti.import<Listener | undefined>(file, { default: true });

				if (!listener) {
					console.warn(`[Loader] File has no default export: ${file}`);
					return;
				}

				if (!(listener instanceof Listener)) {
					console.warn(`[Loader] Default export is not a Listener: ${file}`);
					return;
				}

				this.add(listener);
				return listener;
			} catch (error: unknown) {
				console.error(`An error occurred while trying to add listener for '${file}':`, error);
			}

			return;
		});

		const loaded = (await Promise.all(loads)).filter((x) => x !== undefined);

		console.log(`Loaded ${loaded.length} listener(s).`);

		return loaded;
	}

	public add(listener: Listener): void {
		if (!(listener instanceof Listener)) {
			throw new Error("Invalid listener provided");
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const execute = (...args: any[]) => {
			void listener.execute(new Context(), ...(args as never));
		};

		this.listeners.push(listener);
		this.executors.set(listener, execute);

		const { once, name } = listener.options;

		this.client[once ? "once" : "on"](name, execute);
	}

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

	public getBaseIntents() {
		return new IntentsBitField([GatewayIntentBits.Guilds]);
	}

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
