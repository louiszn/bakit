import type { IntentsBitField } from "discord.js";
import { resolve } from "node:path";

import { BakitClient } from "../client/BakitClient.js";
import { getConfig, loadConfig } from "@/config.js";

import { ProjectCacheManager } from "./ProjectCacheManager.js";
import { chatInputCommandHandler, messageCommandHandler, registerCommandsHandler } from "@/defaults/index.js";

import { RPC } from "@/lib/RPC.js";
import { isImported, isImportedBy } from "@/lib/loader/loader.js";
import { getTopLevelDirectory } from "@/lib/index.js";

const HOT_DIRECTORIES = ["listeners", "commands"] as const;
const SOURCE_ROOT = resolve(process.cwd(), "src");

export class Instance {
	public client!: BakitClient;

	public cache: ProjectCacheManager;

	private rpc: RPC;

	public constructor() {
		this.cache = new ProjectCacheManager();
		this.rpc = new RPC(process);
	}

	public async start() {
		await loadConfig();
		const config = getConfig();

		this.client = new BakitClient(
			{
				intents: [],
				...config.clientOptions,
			},
			this,
		);

		await this.loadModules();
		this.initIntents();

		await this.client.login(config.token);

		this.initProcess();
	}

	private initProcess() {
		if (process.env["NODE_ENV"] === "development") {
			this.rpc.on("fileRemove", (_id, path) => this.onFileRemove(path));
			this.rpc.on("fileChange", (_id, path) => this.onFileChange(path));
		}

		process.on("SIGINT", () => this.shutdown());
		process.on("SIGTERM", () => this.shutdown());
	}

	private loadModules() {
		const { managers } = this.client;
		const { commands, listeners } = managers;

		listeners.add(chatInputCommandHandler);
		listeners.add(messageCommandHandler);
		listeners.add(registerCommandsHandler);

		return Promise.all([commands.loadModules("src"), listeners.loadModules("src")]);
	}

	private initIntents() {
		const config = getConfig();

		const { options, managers } = this.client;
		const { listeners } = managers;

		let intents: IntentsBitField;

		if (config.intents === "auto") {
			intents = listeners.getNeededIntents();
		} else {
			intents = listeners.getBaseIntents();

			if (typeof config.intents === "bigint") {
				intents.bitfield = Number(config.intents);
			} else {
				intents.add(...config.intents);
			}
		}

		options.intents = intents;
	}

	private isInHotDirectory(path: string): boolean {
		if (!path.startsWith(SOURCE_ROOT)) {
			return false;
		}

		const topLevelDir = getTopLevelDirectory(path, SOURCE_ROOT);
		return !!topLevelDir && HOT_DIRECTORIES.includes(topLevelDir as never);
	}

	private isFileHotReloadable(path: string): boolean {
		path = resolve(path);

		if (!this.isInHotDirectory(path)) {
			return false;
		}

		const isLeaked = isImportedBy(path, (parentPath) => {
			return !this.isInHotDirectory(parentPath);
		});

		if (isLeaked) {
			return false;
		}

		return true;
	}

	private restart() {
		this.rpc.send("restart", {});
	}

	public async shutdown() {
		if (this.client) {
			await this.client.destroy().catch(() => null);
		}

		process.exit(0);
	}

	private async onFileRemove(path: string) {
		if (!isImported(path)) {
			return;
		}

		if (!this.isFileHotReloadable(path)) {
			this.restart();
			return;
		}

		const topLevelDir = getTopLevelDirectory(path, SOURCE_ROOT);
		const { listeners, commands } = this.client.managers;

		switch (topLevelDir) {
			case "listeners":
				await listeners.unload(path);
				break;
			case "commands":
				await commands.unload(path);
				break;
		}
	}

	private async onFileChange(path: string) {
		if (!isImported(path)) {
			return;
		}

		if (!this.isFileHotReloadable(path)) {
			this.restart();
			return;
		}

		const topLevelDir = getTopLevelDirectory(path, SOURCE_ROOT);
		const { listeners, commands } = this.client.managers;

		switch (topLevelDir) {
			case "listeners":
				await listeners.reload(path);
				break;
			case "commands":
				await commands.reload(path);
				break;
		}
	}
}

export function useApp() {
	return new Instance();
}
