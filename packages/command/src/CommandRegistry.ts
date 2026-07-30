import {
	type Bakit,
	type ClientInteractionCreateEvent,
	type ClientMessageCreateEvent,
	Collection,
	Lifecycle,
	type LifecyclePlugin,
} from "bakit";
import type { Promisable } from "type-fest";

import type { Command } from "./command/Command";
import { type CommandContext, createContext, type MessageCommandContext } from "./context";

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
	readonly commands = new Collection<string, Command>();
	readonly lifecycle = new Lifecycle<CommandsLifecycle>();
	readonly prefixes: CommandPrefixResolvable[];

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
		});

		await this.handleContext(context);
	}

	async handleContext(context: CommandContext) {
		let command: Command | undefined;

		if (context.isChatInput()) {
			command = this.commands.get(context.source.commandName);
		} else {
			const { content } = context.source;
			const lowerContent = content.toLowerCase();

			const prefix = (await this.resolvePrefixes(context))
				.sort((a, b) => b.length - a.length)
				.find((p) => lowerContent.startsWith(p.toLowerCase()));

			if (!prefix) {
				return;
			}

			const [commandName] = content.slice(prefix.length).trim().split(/\s+/);

			if (!commandName) {
				return;
			}

			command = this.commands.get(commandName.toLowerCase());
		}

		if (!command) {
			return;
		}

		await command.execute(context);
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
