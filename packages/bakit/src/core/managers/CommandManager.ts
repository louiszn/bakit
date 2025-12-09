import { Collection } from "discord.js";

import { posix } from "path";
import glob from "tiny-glob";

import { Command } from "../structures/Command.js";
import { BaseClientManager } from "./BaseClientManager.js";
import { importModule, isModuleLoaded, unloadModule } from "../../lib/index.js";

export class CommandManager extends BaseClientManager {
	public commands = new Collection<string, Command>();
	public entries = new Collection<string, Command>();

	public async loadModules(entryDir: string): Promise<Command[]> {
		const pattern = posix.join(posix.resolve(entryDir), "commands", "**/*.{ts,js}");
		const files = await glob(pattern, { cwd: process.cwd() });

		const results = await Promise.all(files.map((file) => this.load(file)));
		const filtered = results.filter((c): c is Command => !!c);

		console.log(`[Loader] Loaded ${filtered.length}/${files.length} command(s)`);

		return filtered;
	}

	/**
	 * Load the file and add the command to the registry.
	 * @param path The path to the command file.
	 * @returns The command object if added successfully.
	 */
	public async load(path: string): Promise<Command | undefined> {
		const command = await importModule<Command>(path, true);

		if (!command) {
			console.warn(`[Loader] File has no default export: ${path}`);
			return;
		}

		if (!(command instanceof Command)) {
			console.warn(`[Loader] Default export is not a Command: ${path}`);
			return;
		}

		this.add(command);
		this.entries.set(path, command);

		return command;
	}

	/**
	 * Unload the file and remove the command from the registry.
	 * @param path The path to the command file.
	 * @returns The command object if unloaded successfully.
	 */
	public async unload(path: string): Promise<Command | undefined> {
		let command: Command | undefined | null = this.entries.get(path);

		if (isModuleLoaded(path)) {
			// In case we lost the entry, we will try to get it from the loaded file in jiti's cache
			// This makes sure the old command object is completely deleted
			command ??= await importModule<Command>(path, true);
			unloadModule(path);
		}

		this.entries.delete(path);

		if (!command) {
			return;
		}

		return this.remove(command);
	}

	public async reload(path: string) {
		await this.unload(path);
		const command = await this.load(path);

		if (!command) {
			return;
		}

		console.log(`[Loader] Reloaded command '${command.options.name}' at '${path}'`);

		return command;
	}

	/**
	 * Add a command to the registry.
	 * @param command Command to add.
	 */
	public add(command: Command): void {
		if (!(command instanceof Command)) {
			throw new Error("Invalid command provided");
		}

		const { name } = command.options;

		if (this.commands.has(name)) {
			console.warn(`[Loader] Duplicate command registered: '${name}'`);
			return;
		}

		this.commands.set(name, command);
	}

	/**
	 * Remove a command from the registry.
	 * @param target Command name or object to remove.
	 * @returns The command object if removed successfully.
	 */
	public remove(target: string | Command): Command | undefined {
		if (typeof target !== "string" && !(target instanceof Command)) {
			return;
		}

		const name = typeof target === "string" ? target : target.options.name;
		const existing = this.commands.get(name);

		if (existing) {
			this.commands.delete(name);
			return existing;
		}

		return;
	}

	/**
	 * Get a command using its name.
	 * @param name The command to get.
	 * @returns The command object.
	 */
	public get(name: string) {
		return this.commands.get(name);
	}
}
