import {
	type Bakit,
	type ClientInteractionCreateEvent,
	type ClientMessageCreateEvent,
	Collection,
	Lifecycle,
	type LifecyclePlugin,
} from "bakit";
import type { Promisable } from "type-fest";

import type { Command } from "./command";
import { type CommandContext, createContext, type MessageCommandContext } from "./context";
import { InteractionParser, MessageParser } from "./parser";

export interface CommandInvocation {
	command: Command;
	args: readonly unknown[];
}

export interface CommandsLifecycle {
	invoke: [invocation: CommandInvocation];
}

export type CommandPlugin = LifecyclePlugin<CommandsLifecycle>;
export type CommandPluginFactory = (bakit: Bakit) => CommandPlugin;

export type CommandPrefixesFactory = (context: MessageCommandContext) => Promisable<string[]>;
export type CommandPrefixResolvable = string | CommandPrefixesFactory;

export class CommandRegistry {
	readonly prefixes: CommandPrefixResolvable[];

	readonly commands = new Collection<string, Command>();
	readonly lifecycle = new Lifecycle<CommandsLifecycle>();

	readonly messageParser = new MessageParser();
	readonly interactionParser = new InteractionParser();

	constructor(prefixes?: CommandPrefixResolvable[]) {
		this.prefixes = prefixes ?? [];
	}

	clear() {
		this.commands.clear();
	}

	add(...commands: Command[]) {
		for (const command of commands) {
			if (this.commands.has(command.name)) {
				throw new Error(`Command '${command.name}' already exists`);
			}

			this.commands.set(command.name, command);
		}
	}

	async handleInteractionCreate(event: ClientInteractionCreateEvent) {
		const { interaction } = event;

		if (!interaction.isChatInputCommand()) {
			return;
		}

		const context = createContext({
			source: interaction,
			author: interaction.user,
			client: event.client as Bakit,
		});

		await this.handleContext(context);
	}

	async handleMessageCreate(event: ClientMessageCreateEvent) {
		const message = await event.message.resolve().catch(() => null);
		const author = await event.author.resolve().catch(() => null);

		if (!message || !author || author.bot) {
			return;
		}

		const context = createContext({
			source: message,
			author: message.author,
			client: event.client as Bakit,
		});

		await this.handleContext(context);
	}

	async handleContext(context: CommandContext) {
		if (context.isChatInput()) {
			const command = this.commands.get(context.source.commandName);

			if (!command) {
				return;
			}

			await this.interactionParser.parse({
				command,
				context,
			});

			await command.execute(context);
		} else {
			const parsed = await this.messageParser.parse({
				content: context.source.content,
				prefixes: await this.resolvePrefixes(context),
				commands: this.commands,
				context,
			});

			if (!parsed) {
				return;
			}

			await parsed.command.execute(context);
		}
	}

	async resolvePrefixes(context: MessageCommandContext): Promise<string[]> {
		const resolved = await Promise.all(
			this.prefixes.map((prefix) => {
				return typeof prefix === "string" ? [prefix] : prefix(context);
			}),
		);

		return [...new Set(resolved.flat())];
	}
}
