import { ConstructorLike, HookExecutionState } from "../base/BaseEntry.js";
import {
	Arg,
	ArgumentResolver,
	ArgumentType,
	ChatInputContext,
	Command,
	CommandRegistry,
	MessageContext,
} from "../command/index.js";
import { CommandSyntaxError } from "../errors/CommandSyntaxError.js";

import type { ChatInputCommandInteraction, Message } from "discord.js";
import type { BakitClient } from "../BakitClient.js";
import type {
	CommandEntry,
	CommandGroupEntry,
	CommandHook,
	Context,
	ErrorCommandHookMethod,
	MainCommandHookMethod,
	RootCommandEntry,
	SubcommandEntry,
} from "../command/index.js";

export class CommandDispatcher {
	public constructor(public client: BakitClient) {}

	public async getPrefixes(message: Message) {
		const { options, user } = this.client;

		const results = await Promise.all(
			(options.prefixes ?? []).map(async (prefix) => {
				if (typeof prefix === "string") {
					return [prefix];
				}

				const result = await prefix(message);

				return Array.isArray(result) ? result : [result];
			}),
		);

		const mentionPrefix = options.enableMentionPrefix && user ? [user.toString()] : [];

		const prefixes = [...mentionPrefix, ...results.flat()];
		const filtered = Array.from(new Set(prefixes));

		return filtered;
	}

	public async handleChatInput(interaction: ChatInputCommandInteraction) {
		const { commandName } = interaction;

		const constructor = CommandRegistry.constructors.get(commandName);
		const instance = CommandRegistry.instances.get(commandName);

		if (!constructor || !instance) {
			return;
		}

		const root = Command.getRoot(constructor);

		if (!root) {
			return;
		}

		const context = new ChatInputContext(interaction);

		const triggerChain = this.getChatInputTriggerChain(interaction);
		const chain = this.resolveCommandEntryChain(root, triggerChain);

		const parsedValues = chain.flatMap((entry) => this.resolveChatInputEntry(interaction, entry));

		await this.executeChain(chain, context, instance, parsedValues);
	}

	private getChatInputTriggerChain(interaction: ChatInputCommandInteraction) {
		const chain = [];

		const subcommand = interaction.options.getSubcommand(false);
		const subcommandGroup = interaction.options.getSubcommandGroup(false);

		if (subcommandGroup) {
			chain.push(subcommandGroup);
		}

		if (subcommand) {
			chain.push(subcommand);
		}

		return chain;
	}

	private resolveChatInputEntry(interaction: ChatInputCommandInteraction, entry: CommandEntry) {
		const mainHook = entry.hooks[HookExecutionState.Main];
		const args = mainHook ? Arg.getMethodArguments(mainHook.method) : [];

		return args.map((arg) => {
			return ArgumentResolver.resolveChatInputOption(interaction, arg);
		});
	}

	public async handleMessage(message: Message) {
		const resolver = await ArgumentResolver.initialize(message);

		if (!resolver) {
			return;
		}

		const constructor = CommandRegistry.constructors.get(resolver.commandName);
		const instance = CommandRegistry.instances.get(resolver.commandName);

		if (!constructor || !instance) {
			return;
		}

		const root = Command.getRoot(constructor);

		if (!root) {
			return;
		}

		const context = new MessageContext(message);

		try {
			await resolver.resolve(root);
		} catch (error) {
			if (error instanceof CommandSyntaxError) {
				const payload = await this.client.options.getSyntaxErrorMessage?.(
					instance,
					error,
					context,
					resolver,
				);

				if (payload) {
					await context.send(payload);
				}
			} else {
				throw error;
			}
		}

		const literalTriggers = resolver.args
			.filter((arg) => arg.type === ArgumentType.Literal)
			.map((arg) => arg.value);

		const entryChain = this.resolveCommandEntryChain(root, literalTriggers);

		await this.executeChain(entryChain, context, instance, resolver.parsedValues as unknown[]);
	}

	private resolveCommandEntryChain(root: RootCommandEntry, triggers: string[]): CommandEntry[] {
		return triggers.reduce<CommandEntry[]>(
			(acc, trigger) => {
				const parent = acc.at(-1);

				if (parent && "children" in parent) {
					const child = parent.children.get(trigger);

					if (child) {
						acc.push(child);
					}
				}

				return acc;
			},
			[root],
		);
	}

	private async executeChain(
		chain: (SubcommandEntry | CommandGroupEntry | RootCommandEntry)[],
		context: Context,
		instance: InstanceType<ConstructorLike>,
		values: unknown[],
	) {
		for (const entry of chain) {
			await this.executeHooks(entry, context, instance, values);
		}
	}

	private async executeHooks(
		entry: RootCommandEntry | CommandGroupEntry | SubcommandEntry,
		context: Context,
		instance: InstanceType<ConstructorLike>,
		values: unknown[],
	) {
		const { hooks } = entry;

		if (!hooks[HookExecutionState.Main]) {
			return;
		}

		const execute = async (hook?: CommandHook, error?: unknown) => {
			if (!hook) {
				return;
			}

			if (hook.state === HookExecutionState.Error) {
				await (hook.method as ErrorCommandHookMethod).call(instance, error, context, ...values);

				return;
			}

			await (hook.method as MainCommandHookMethod).call(instance, context, ...values);
		};

		try {
			await execute(hooks[HookExecutionState.Pre]);
			await execute(hooks[HookExecutionState.Main]);
			await execute(hooks[HookExecutionState.Post]);
		} catch (error) {
			if (hooks[HookExecutionState.Error]) {
				await execute(hooks[HookExecutionState.Error], error);
			} else {
				throw error;
			}
		}
	}
}
