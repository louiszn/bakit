import {
	Awaitable,
	ChatInputCommandInteraction,
	Client,
	ClientOptions,
	codeBlock,
	Events,
	IntentsBitField,
	Interaction,
	Message,
	MessageCreateOptions,
} from "discord.js";
import { CommandRegistry } from "./command/CommandRegistry.js";
import {
	BaseCommandEntry,
	CommandGroupEntry,
	CommandHook,
	CommandHookExecutionState,
	RootCommandEntry,
	SubcommandEntry,
} from "./command/CommandEntry.js";
import {
	Arg,
	ArgumentOptions,
	ChatInputContext,
	Command,
	CommandConstructor,
	MessageContext,
} from "./command/index.js";
import { ArgumentResolver } from "./command/argument/ArgumentResolver.js";
import { StateBox } from "./libs/StateBox.js";
import { CommandSyntaxError } from "./errors/index.js";
import { ListenerRegistry } from "./listener/ListenerRegistry.js";

export type GetSyntaxErrorMessageFunction = (
	command: object,
	error: CommandSyntaxError,
	context: MessageContext,
	args: readonly ArgumentOptions[],
	prefix: string,
) => Awaitable<MessageCreateOptions | undefined>;

export interface BakitClientOptions extends ClientOptions {
	prefixes?: string[];
	enableMentionPrefix?: boolean;
	getSyntaxErrorMessage?: GetSyntaxErrorMessageFunction | null;
}

export class BakitClient<Ready extends boolean = boolean> extends Client<Ready> {
	declare public options: Omit<BakitClientOptions, "intents"> & { intents: IntentsBitField };

	public constructor(options: BakitClientOptions) {
		if (options.getSyntaxErrorMessage === undefined) {
			options.getSyntaxErrorMessage = BakitClient.getSyntaxErrorMessage;
		}

		super(options);

		ListenerRegistry.setClient(this);

		this.once(
			Events.ClientReady,
			(client) => void this.registerApplicationCommands(client as BakitClient<true>),
		);

		this.on(Events.InteractionCreate, (interaction) => void this.handleInteraction(interaction));
		this.on(Events.MessageCreate, (message) => void this.handleMessage(message));
	}

	public static getSyntaxErrorMessage: GetSyntaxErrorMessageFunction = (
		command,
		error,
		context,
		args,
		prefix,
	) => {
		const requiredSyntax = args.map((x) => Arg.format(x)).join(" ");

		const root = Command.getRoot(command.constructor as CommandConstructor);

		if (!root) {
			return;
		}

		const content = [
			codeBlock(error.message),
			"Required Syntax:",
			codeBlock(`${prefix}${root.options.name} ${requiredSyntax}`),
		].join("\n");

		return {
			content,
		};
	};

	private async registerApplicationCommands(client: BakitClient<true>): Promise<void> {
		const commands = CommandRegistry.constructors.map((c) => CommandRegistry.buildSlashCommand(c));
		await client.application.commands.set(commands);
	}

	private async handleMessage(message: Message) {
		if (message.author.bot) {
			return;
		}

		const resolver = ArgumentResolver.create(message);

		if (!resolver) {
			return;
		}

		const { trigger } = resolver;

		const command = CommandRegistry.instances.get(trigger);

		if (!command) {
			return;
		}

		const hooks = BaseCommandEntry.getHooks(command.constructor as CommandConstructor);

		const context = new MessageContext(message);

		await StateBox.run(() => this.handleMessageHooks(context, hooks, command, resolver));
	}

	private async handleInteraction(interaction: Interaction) {
		if (!interaction.isChatInputCommand()) {
			return;
		}

		const { commandName } = interaction;

		const command = CommandRegistry.instances.get(commandName);

		if (!command) {
			return;
		}

		const hooks = BaseCommandEntry.getHooks(command.constructor as CommandConstructor);

		const context = new ChatInputContext(interaction);

		await StateBox.run(() => this.handleChatInputHooks(context, hooks, command));
	}

	private async handleChatInputHooks(
		context: ChatInputContext,
		hooks: readonly CommandHook[],
		instance: unknown,
	) {
		const targetHooks = this.getChatInputTargetHooks(context.source, hooks);

		let inheritedArgs: unknown[] = [];

		for (const record of [targetHooks.root, targetHooks.group, targetHooks.subcommand]) {
			const newArgs = await this.runChatInputHooks(context, instance, record, inheritedArgs);

			if (newArgs) {
				inheritedArgs = newArgs;
			}
		}
	}

	private async handleMessageHooks(
		context: MessageContext,
		hooks: readonly CommandHook[],
		instance: object,
		resolver: ArgumentResolver | null,
	) {
		if (!resolver) {
			return;
		}

		const rootEntry = Command.getRoot(instance.constructor as CommandConstructor);
		if (!rootEntry) return;

		const rootRecord = this.createHookRecord(hooks.filter((hook) => hook.entry === rootEntry));
		resolver = await this.runMessageHooks(context, instance, rootRecord, resolver);

		if (!resolver) {
			return;
		}

		const usedValues = resolver.parsedValues.length;
		const nextTrigger = resolver.values[usedValues + 1];

		const nextHook = hooks.find((hook) => hook.entry.options.name === nextTrigger);
		const nextRecord = this.createHookRecord(nextHook ? [nextHook] : []);

		resolver = await this.runMessageHooks(context, instance, nextRecord, resolver);

		if (!resolver) {
			return;
		}

		if (nextRecord.main?.entry instanceof CommandGroupEntry) {
			const groupEntry = nextRecord.main.entry;
			const subTrigger = resolver.values[usedValues + 2];

			const subHook = hooks.find(
				(h) =>
					h.entry instanceof SubcommandEntry &&
					h.entry.options.name === subTrigger &&
					h.entry.parent === groupEntry,
			);

			const subRecord = this.createHookRecord(subHook ? [subHook] : []);
			resolver = await this.runMessageHooks(context, instance, subRecord, resolver);
		}
	}

	private async runMessageHooks(
		context: MessageContext,
		instance: object,
		record: Record<CommandHookExecutionState, CommandHook | undefined>,
		resolver: ArgumentResolver,
	): Promise<ArgumentResolver | null> {
		if (!record.main) {
			return resolver;
		}

		const args = Arg.getMethodArguments(record.main.method);

		try {
			resolver = await resolver.resolve(args as ArgumentOptions[]);
		} catch (error) {
			if (error instanceof CommandSyntaxError) {
				const errorContent = await this.options.getSyntaxErrorMessage?.(
					instance,
					error,
					context,
					args,
					resolver.options.prefix,
				);

				if (errorContent) {
					await context.send(errorContent);
				}

				return null;
			}

			throw error;
		}

		try {
			await record.pre?.method.call(instance, context, ...resolver.parsedValues);
			await record.main.method.call(instance, context, ...resolver.parsedValues);
			await record.post?.method.call(instance, context, ...resolver.parsedValues);
		} catch (error) {
			if (record.error) {
				await record.error.method.call(instance, context, error, ...resolver.parsedValues);
			} else {
				throw error;
			}
		}

		return resolver;
	}

	private async runChatInputHooks(
		context: ChatInputContext,
		instance: unknown,
		record: Record<CommandHookExecutionState, CommandHook | undefined>,
		inheritedArgs: unknown[],
	): Promise<undefined | unknown[]> {
		if (!record.main) {
			return;
		}

		const newArgs = Arg.getMethodArguments(record.main.method).map((arg) =>
			ArgumentResolver.resolveChatInput(context.source, arg),
		);

		const argValues = [...inheritedArgs, ...newArgs];

		try {
			await record.pre?.method.call(instance, context, ...argValues);
			await record.main.method.call(instance, context, ...argValues);
			await record.post?.method.call(instance, context, ...argValues);
		} catch (error) {
			if (record.error) {
				await record.error.method.call(instance, context, error, ...argValues);
			} else {
				throw error;
			}
		}

		return argValues;
	}

	private getChatInputTargetHooks(
		interaction: ChatInputCommandInteraction,
		hooks: readonly CommandHook[],
	) {
		const subcommand = interaction.options.getSubcommand(false);
		const subcommandGroup = interaction.options.getSubcommandGroup(false);

		const root = this.createHookRecord(
			hooks.filter((hook) => hook.entry instanceof RootCommandEntry),
		);

		const group = this.createHookRecord(
			hooks.filter(({ entry }) => {
				return entry instanceof CommandGroupEntry && entry.options.name === subcommandGroup;
			}),
		);

		const sub = this.createHookRecord(
			hooks.filter(({ entry }) => {
				if (!(entry instanceof SubcommandEntry) || !(entry.options.name === subcommand)) {
					return false;
				}

				if (subcommandGroup) {
					const { parent } = entry;

					if (!(parent instanceof CommandGroupEntry) || parent.options.name !== subcommandGroup) {
						return false;
					}
				}

				return true;
			}),
		);

		return { root, group, subcommand: sub };
	}

	private createHookRecord(hooks: readonly CommandHook[]) {
		return Object.values(CommandHookExecutionState).reduce(
			(acc, state) => {
				acc[state] = hooks.find((h) => h.state === state);
				return acc;
			},
			{} as Record<CommandHookExecutionState, CommandHook | undefined>,
		);
	}
}
