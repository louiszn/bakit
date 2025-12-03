import { Collection } from "discord.js";

import { posix } from "path";
import { pathToFileURL } from "url";
import glob from "tiny-glob";

import { Command } from "./Command.js";
import { BaseClientManager } from "../base/index.js";
import { getConfig } from "../config.js";

export class CommandManager extends BaseClientManager {
	public commands = new Collection<string, Command>();

	public async loadModules(): Promise<Command[]> {
		const entryDir = posix.resolve(getConfig().entryDir);

		const pattern = posix.join(entryDir, "commands", "**/*.{ts,js}");

		const files = await glob(pattern, {
			cwd: process.cwd(),
		});

		const loads = files.map(async (file) => {
			try {
				const { default: command } = (await import(pathToFileURL(file).toString())) as {
					default?: Command;
				};

				if (!command) {
					console.warn(`[Loader] File has no default export: ${file}`);
					return;
				}

				if (!(command instanceof Command)) {
					console.warn(`[Loader] Default export is not a Command: ${file}`);
					return;
				}

				this.add(command);
				return command;
			} catch (error: unknown) {
				console.error(`An error occurred while trying to add command for '${file}':`, error);
			}
		});

		const loaded = (await Promise.all(loads)).filter((x) => x !== undefined);

		console.log(`Loaded ${loaded.length} command(s).`);

		return loaded;
	}

	public add(command: Command): void {
		if (!(command instanceof Command)) {
			throw new Error("Invalid command provided");
			return;
		}

		const { name } = command.options;

		if (this.commands.has(name)) {
			console.warn(`[Loader] Duplicate command registered: '${name}'`);
			return;
		}

		this.commands.set(name, command);
	}

	public remove(target: string | Command): Command | undefined {
		const name = typeof target === "string" ? target : target.options.name;
		const existing = this.commands.get(name);

		if (existing) {
			this.commands.delete(name);
			return existing;
		}
	}

	public get(name: string) {
		return this.commands.get(name);
	}
}
