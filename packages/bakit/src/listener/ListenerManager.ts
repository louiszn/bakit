import { Collection } from "discord.js";

import { posix } from "path";
import { pathToFileURL } from "url";
import glob from "tiny-glob";

import { Listener } from "./Listener.js";
import { BaseClientManager } from "../base/index.js";
import { getConfig } from "../config.js";

export class ListenerManager extends BaseClientManager {
	public listeners = new Collection<string, Listener>();

	public async loadModules(): Promise<Listener[]> {
		const entryDir = posix.resolve(getConfig().entryDir);

		const pattern = posix.join(entryDir, "listeners", "**/*.{ts,js}");

		const files = await glob(pattern, {
			cwd: process.cwd(),
		});

		const loads = files.map(async (file) => {
			try {
				const { default: listener } = (await import(pathToFileURL(file).toString())) as {
					default?: Listener;
				};

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
			return;
		}

		const { name } = listener.options;

		if (this.listeners.has(name)) {
			console.warn(`[Loader] Duplicate listener registered: '${name}'`);
			return;
		}

		this.listeners.set(name, listener);
	}

	public remove(target: string | Listener): Listener | undefined {
		const name = typeof target === "string" ? target : target.options.name;
		const existing = this.listeners.get(name);

		if (existing) {
			this.listeners.delete(name);
			return existing;
		}

		return;
	}

	public get(name: string) {
		return this.listeners.get(name);
	}
}
