import {
	type Bakit,
	type ClientInteractionCreateEvent,
	type ClientMessageCreateEvent,
	Collection,
	Lifecycle,
	type LifecyclePlugin,
} from "bakit";
import type { Promisable } from "type-fest";

import type { ExecutableCommand, RootCommand } from "./command";
import { type CommandContext, createContext, type MessageCommandContext } from "./context";
import { CommandError, CommandExecutionError } from "./errors";
import { InteractionParser, MessageParser } from "./parser";

export interface CommandInvocation {
	root: RootCommand;
	executable: ExecutableCommand;
	context: CommandContext;
}

export interface CommandsLifecycle {
	parse: [context: CommandContext];
	invoke: [invocation: CommandInvocation];
}

export type CommandPlugin = LifecyclePlugin<CommandsLifecycle>;
export type CommandPluginFactory = (bakit: Bakit) => CommandPlugin;

export type CommandPrefixesFactory = (context: MessageCommandContext) => Promisable<string[]>;
export type CommandPrefixResolvable = string | CommandPrefixesFactory;

export class CommandRegistry {
	readonly prefixes: CommandPrefixResolvable[];

	readonly commands = new Collection<string, RootCommand>();
	readonly lifecycle = new Lifecycle<CommandsLifecycle>();

	readonly messageParser = new MessageParser();
	readonly interactionParser = new InteractionParser();

	constructor(prefixes?: CommandPrefixResolvable[]) {
		this.prefixes = prefixes ?? [];
	}

	clear() {
		this.commands.clear();
	}

	add(...commands: RootCommand[]) {
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
		}) as CommandContext<never>;

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
		}) as CommandContext<never>;

		await this.handleContext(context);
	}

	async handleContext(context: CommandContext<never>) {
		let root: RootCommand | undefined;
		let executable: ExecutableCommand | undefined;

		await this.lifecycle.run(
			"parse",
			async () => {
				if (context.isChatInput()) {
					const command = this.commands.get(context.source.commandName);

					if (!command) {
						return;
					}

					const parsed = await this.interactionParser.parse({
						root: command,
						context,
					});

					root = parsed.root;
					executable = parsed.executable;
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

					root = parsed.root;
					executable = parsed.executable;
				}
			},
			context,
		);

		if (!root || !executable) {
			return;
		}

		await this.lifecycle.run(
			"invoke",
			async () => {
				if (!executable || !root) {
					return;
				}

				try {
					await executable.execute(context);
				} catch (error) {
					if (error instanceof CommandError) {
						throw error;
					}

					throw new CommandExecutionError(root, executable, context, error);
				}
			},
			{
				root,
				executable,
				context,
			},
		);
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
