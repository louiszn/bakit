import { Client, ClientOptions, Events } from "discord.js";
import { CommandRegistry } from "./command/CommandRegistry.js";

export interface BakitClientOptions extends ClientOptions {
	prefixes?: string[];
	enableMentionPrefix?: boolean;
}

export class BakitClient<Ready extends boolean = boolean> extends Client<Ready> {
	public constructor(options: BakitClientOptions) {
		super(options);

		this.once(
			Events.ClientReady,
			(client) => void this.registerApplicationCommands(client as BakitClient<true>),
		);
	}

	private async registerApplicationCommands(client: BakitClient<true>): Promise<void> {
		const commands = CommandRegistry.commands.map((c) => CommandRegistry.buildSlashCommand(c));
		await client.application.commands.set(commands);
	}
}
