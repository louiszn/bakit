import { IntentsBitField } from "discord.js";
import { BakitClient } from "./BakitClient.js";
import { getConfig, loadConfig } from "./config.js";

import { chatInputCommandHandler, messageCommandHandler } from "./defaults/index.js";

export class Instance {
	public client!: BakitClient;

	public async start() {
		await loadConfig();
		const config = getConfig();

		this.client = new BakitClient({
			intents: [],
		});

		await this.loadModules();
		this.initIntents();

		await this.client.login(config.token);
	}

	private loadModules() {
		const { managers } = this.client;
		const { commands, listeners } = managers;

		listeners.add(chatInputCommandHandler);
		listeners.add(messageCommandHandler);

		return Promise.all([commands.loadModules(), listeners.loadModules()]);
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
}

export function useApp() {
	return new Instance();
}
