import { Events } from "discord.js";
import { defineListener } from "../base/listener/Listener.js";
import { getConfig } from "../config.js";
import type { BakitClient } from "../base/BakitClient.js";
import { tokenize } from "../utils/string.js";
import { ChatInputContext, MessageContext } from "../base/command/index.js";

export const messageCommandHandler = defineListener(Events.MessageCreate);
export const chatInputCommandHandler = defineListener(Events.InteractionCreate);
export const registerCommandsHandler = defineListener({
	name: Events.ClientReady,
	once: true,
});

registerCommandsHandler.main(async (_, client) => {
	const { commands } = client.managers;

	const data = commands.commands.map((cmd) => cmd.toSlashCommandJSON());

	const result = await client.application.commands.set(data);

	console.log(`Registered ${result.size} application command(s)`);
});

messageCommandHandler.main(async (_, message) => {
	const config = getConfig();

	if (message.author.bot) {
		return;
	}

	const { content } = message;
	const client = message.client as BakitClient<true>;

	const lowerContent = content.toLowerCase();
	const prefix = config.prefixes.find((p) => lowerContent.startsWith(p));

	if (!prefix) {
		return;
	}

	const [name, ...args] = content.slice(prefix.length).trim().split(/\s+/g);

	if (!name) {
		return;
	}

	const command = client.managers.commands.get(name);

	if (!command) {
		return;
	}

	const context = new MessageContext(message);

	const { params, quotes } = command.options;

	const rawArgs = quotes ? tokenize(args.join(" ")) : args;
	const resolvedArgs: unknown[] = [];

	for (let i = 0; i < params.length; i++) {
		const param = params[i];
		const arg = rawArgs[i];

		if (!param) {
			break;
		}

		const resolved = await param.resolve(context, arg);
		resolvedArgs.push(resolved);
	}

	await command.execute(context, ...resolvedArgs);
});

chatInputCommandHandler.main(async (_, interaction) => {
	if (!interaction.isChatInputCommand()) {
		return;
	}

	const { commandName } = interaction;
	const client = interaction.client as BakitClient<true>;

	const command = client.managers.commands.get(commandName);

	if (!command) {
		return;
	}

	const context = new ChatInputContext(interaction);
	const { params } = command.options;

	const resolvedArgs = [];

	for (const param of params) {
		const resolved = await param.resolve(context);
		resolvedArgs.push(resolved);
	}

	await command.execute(context, ...resolvedArgs);
});
