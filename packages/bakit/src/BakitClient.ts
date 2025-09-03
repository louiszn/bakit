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
	CommandGroupEntry,
	CommandHook,
	ErrorCommandHookMethod,
	MainCommandHookMethod,
	RootCommandEntry,
	SubcommandEntry,
} from "./command/CommandEntry.js";
import {
	Arg,
	ArgumentOptions,
	ChatInputContext,
	Command,
	Context,
	MessageContext,
} from "./command/index.js";
import { ArgumentResolver } from "./command/argument/ArgumentResolver.js";
import { StateBox } from "./libs/StateBox.js";
import { CommandSyntaxError } from "./errors/index.js";
import { ListenerRegistry } from "./listener/ListenerRegistry.js";
import { ConstructorLike, HookExecutionState } from "./base/BaseEntry.js";

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

		ListenerRegistry["setClient"](this);

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

		const root = Command.getRoot(command.constructor as ConstructorLike);

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

		const context = new MessageContext(message);

		const resolver = ArgumentResolver.create(message);

		if (!resolver) {
			return;
		}

		const { trigger } = resolver;

		const command = CommandRegistry.instances.get(trigger);

		if (!command) {
			return;
		}

		await StateBox.run(() => this.handleMessageHooks(context, command, resolver));
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

		const context = new ChatInputContext(interaction);

		await StateBox.run(() => this.handleChatInputHooks(context, command));
	}

	private async handleChatInputHooks(context: ChatInputContext, instance: object) {
		const targetHooks = this.getChatInputTargetHooks(context.source, instance);

		let inheritedArgs: unknown[] = [];

		for (const hooks of [targetHooks.root, targetHooks.group, targetHooks.subcommand]) {
			if (!hooks) {
				continue;
			}

			const newArgs = await this.runChatInputHooks(context, instance, hooks, inheritedArgs);

			if (newArgs) {
				inheritedArgs = newArgs;
			}
		}
	}

	private async handleMessageHooks(
		context: MessageContext,
		instance: object,
		resolver: ArgumentResolver | null,
	) {
		// This is just for removing the null type
		// resolver must not be null at first
		if (!resolver) {
			return;
		}

		const root = Command.getRoot(instance.constructor as ConstructorLike);

		if (!root) {
			return;
		}

		resolver = await this.runMessageHooks(context, instance, root.hooks, resolver);

		if (!resolver) {
			return;
		}

		await this.handleChildMessageHooks(context, root, instance, resolver);
	}

	private async handleChildMessageHooks(
		context: MessageContext,
		parent: RootCommandEntry | CommandGroupEntry,
		instance: object,
		resolver: ArgumentResolver | null,
		skip = 1,
	) {
		if (!resolver) {
			return;
		}

		const usedValues = resolver.parsedValues.length;
		const nextTrigger = resolver.values[usedValues + skip];

		const child = parent.children.get(nextTrigger);

		if (!child) {
			return;
		}

		resolver = await this.runMessageHooks(context, instance, child.hooks, resolver);

		if (child instanceof CommandGroupEntry) {
			await this.handleChildMessageHooks(context, child, instance, resolver, skip + 1);
		}
	}

	private async runMessageHooks(
		context: MessageContext,
		instance: object,
		hooks: Record<HookExecutionState, CommandHook | undefined>,
		resolver: ArgumentResolver,
	): Promise<ArgumentResolver | null> {
		const mainHook = hooks[HookExecutionState.Main];

		if (!mainHook) {
			return resolver;
		}

		const args = Arg.getMethodArguments(mainHook.method);

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

		await this.runHooks(context, instance, hooks, resolver.parsedValues);

		return resolver;
	}

	private async runChatInputHooks(
		context: ChatInputContext,
		instance: object,
		hooks: Record<HookExecutionState, CommandHook | undefined>,
		inheritedArgs: unknown[],
	): Promise<undefined | unknown[]> {
		const mainHook = hooks[HookExecutionState.Main];

		if (!mainHook) {
			return;
		}

		const newArgs = Arg.getMethodArguments(mainHook.method).map((arg) =>
			ArgumentResolver.resolveChatInput(context.source, arg),
		);

		const argValues = [...inheritedArgs, ...newArgs];

		await this.runHooks(context, instance, hooks, argValues);

		return argValues;
	}

	private async runHooks(
		context: Context,
		instance: object,
		hooks: Record<HookExecutionState, CommandHook | undefined>,
		args: unknown[],
	) {
		const mainHook = hooks[HookExecutionState.Main];
		const preHook = hooks[HookExecutionState.Pre];
		const postHook = hooks[HookExecutionState.Post];
		const errorHook = hooks[HookExecutionState.Error];

		if (!mainHook) {
			return;
		}

		const execute = async (hook?: CommandHook, error?: unknown) => {
			if (!hook) {
				return;
			}

			if (hook.state === HookExecutionState.Error) {
				await (hook.method as ErrorCommandHookMethod).call(instance, error, context, ...args);
			} else {
				await (hook.method as MainCommandHookMethod).call(instance, context, ...args);
			}
		};

		try {
			await execute(preHook);
			await execute(mainHook);
			await execute(postHook);
		} catch (error) {
			if (errorHook) {
				await execute(errorHook, error);
			} else {
				throw error;
			}
		}
	}

	private getChatInputTargetHooks(interaction: ChatInputCommandInteraction, instance: object) {
		const subcommandName = interaction.options.getSubcommand(false);
		const groupName = interaction.options.getSubcommandGroup(false);

		const root = Command.getRoot(instance.constructor as ConstructorLike);

		if (!root) {
			throw new Error("No root found.");
		}

		let group: CommandGroupEntry | undefined;

		if (groupName) {
			const child = root.children.get(groupName);

			if (child instanceof CommandGroupEntry) {
				group = child;
			}
		}

		let subcommand: SubcommandEntry | undefined;

		if (subcommandName) {
			const parent = group || root;
			const child = parent.children.get(subcommandName);

			if (child instanceof SubcommandEntry) {
				subcommand = child;
			}
		}

		return {
			root: root.hooks,
			group: group?.hooks,
			subcommand: subcommand?.hooks,
		};
	}
}
