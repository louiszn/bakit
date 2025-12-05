import { Events } from "discord.js";
import { defineListener } from "../listener/Listener.js";
import { getConfig } from "../config.js";
import type { BakitClient } from "../BakitClient.js";
import { ChatInputContext, MessageContext } from "./CommandContext.js";
import { tokenize } from "../utils/string.js";

export const messageCommandListener = defineListener(Events.MessageCreate);
export const interactionCommandListener = defineListener(Events.InteractionCreate);

messageCommandListener.main(async (_, message) => {
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

interactionCommandListener.main(async (_, interaction) => {
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
