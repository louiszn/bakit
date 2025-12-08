import { Events } from "discord.js";
import type { BakitClient } from "../base/client/BakitClient.js";
import { ChatInputContext, MessageContext } from "../base/command/index.js";
import { defineListener } from "../base/listener/Listener.js";
import { getConfig } from "../config.js";
import { tokenize } from "../utils/string.js";

export const messageCommandHandler = defineListener(Events.MessageCreate);
export const chatInputCommandHandler = defineListener(Events.InteractionCreate);
export const registerCommandsHandler = defineListener({
	name: Events.ClientReady,
	once: true,
});

registerCommandsHandler.main(async (_, client) => {
	const { managers, instance } = client;
	const { commands } = managers;
	const { cache } = instance;

	const payload = commands.commands.map((cmd) => cmd.toSlashCommandJSON()).sort((a, b) => a.name.localeCompare(b.name));

	const currentHash = cache.getHash(payload);

	const CACHE_KEY = "commands/meta.json";
	const cachedMeta = await cache.read<{ hash: string; timestamp: number; count: number }>(CACHE_KEY);

	if (cachedMeta && cachedMeta.hash === currentHash) {
		const { timestamp, count } = cachedMeta;
		const time = new Date(timestamp).toLocaleString();

		console.log(`${count} command(s) are up to date (Last sync: ${time}). Skipping registration.`);

		return;
	}

	try {
		const result = await client.application.commands.set(payload);

		cache.write(CACHE_KEY, {
			hash: currentHash,
			timestamp: Date.now(),
			count: result.size,
		});

		cache.write("commands/debug_dump.json", payload);

		console.log(`Registered ${result.size} application command(s).`);
	} catch (error) {
		console.error("Failed to register commands:", error);
	}
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
