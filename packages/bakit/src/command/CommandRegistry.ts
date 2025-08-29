import {
	ApplicationCommandOptionBase,
	Collection,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from "discord.js";

import glob from "tiny-glob";

import { pathToFileURL } from "node:url";

import { Command, CommandConstructor } from "./Command.js";
import { CommandHook } from "./CommandEntry.js";
import { Arg, ArgumentOptions, ArgumentType } from "./argument/index.js";
import {
	BaseCommandEntry,
	CommandGroupEntry,
	CommandHookExecutionState,
	SubcommandEntry,
} from "./CommandEntry.js";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommandRegistry {
	public static constructors = new Collection<string, CommandConstructor>();
	public static instances = new Collection<string, object>();

	public static add(constructor: CommandConstructor) {
		const root = Command.getRoot(constructor);

		if (!root) {
			throw new Error(`No root found for "${constructor.name}"`);
		}

		const { options } = root;

		this.constructors.set(options.name, constructor);
		this.instances.set(options.name, new constructor());
	}

	public static buildSlashCommand(
		constructor: CommandConstructor,
	): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder();

		const root = Command.getRoot(constructor);

		if (!root) {
			throw new Error(`No root found for "${constructor.name}"`);
		}

		const { options } = root;

		builder.setName(options.name);
		builder.setDescription(options.description || "");
		builder.setNSFW(Boolean(options.nsfw));

		this.buildSlashCommandOptions(builder, constructor);

		return builder.toJSON();
	}

	public static async loadDirectory(
		pattern: string,
		parallel = true,
	): Promise<CommandConstructor[]> {
		const files = await glob(pattern);

		const loaders = files.map(async (file) => {
			const fileURL = pathToFileURL(file).toString();

			const { default: constructor } = (await import(fileURL)) as {
				default: CommandConstructor;
			};

			CommandRegistry.add(constructor);

			return constructor;
		});

		if (parallel) {
			return await Promise.all(loaders);
		}

		const result: CommandConstructor[] = [];

		for (const loader of loaders) {
			result.push(await loader);
		}

		return result;
	}

	private static buildSlashCommandOptions(
		builder: SlashCommandBuilder,
		constructor: CommandConstructor,
	) {
		const root = Command.getRoot(constructor);

		if (!root) {
			throw new Error(`No root found for "${constructor.name}"`);
		}

		const hooks = new Collection(
			BaseCommandEntry.getHooks(constructor)
				.filter((hook) => hook.state === CommandHookExecutionState.Main)
				.map((hook) => [hook.entry, hook]),
		);

		const rootHook = hooks.get(root);

		if (!root.children.size && hooks.size) {
			if (!rootHook) {
				return;
			}

			for (const arg of Arg.getMethodArguments(rootHook.method)) {
				this.buildSlashCommandOption(builder, arg);
			}

			return;
		}

		for (const child of root.children.values()) {
			const hook = hooks.get(child);

			const inheritedArgs = [];

			if (rootHook) {
				inheritedArgs.push(...Arg.getMethodArguments(rootHook.method));
			}

			if (child instanceof SubcommandEntry) {
				this.buildSubcommand(builder, child, hook, inheritedArgs);
			} else if (child instanceof CommandGroupEntry) {
				if (hook) {
					inheritedArgs.push(...Arg.getMethodArguments(hook.method));
				}

				const { options } = child;

				const group = new SlashCommandSubcommandGroupBuilder()
					.setName(options.name)
					.setDescription(options.description);

				for (const subChild of child.children.values()) {
					this.buildSubcommand(group, subChild, hooks.get(subChild), inheritedArgs);
				}

				builder.addSubcommandGroup(group);
			}
		}
	}

	private static buildSubcommand(
		parent: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder,
		entry: SubcommandEntry,
		hook: CommandHook | undefined,
		inheritedArgs: ArgumentOptions[],
	) {
		const { options } = entry;

		const subcommand = new SlashCommandSubcommandBuilder()
			.setName(options.name)
			.setDescription(options.description);

		const args = [...inheritedArgs];

		if (hook) {
			args.push(...Arg.getMethodArguments(hook.method));
		}

		for (const arg of args) {
			this.buildSlashCommandOption(subcommand, arg);
		}

		parent.addSubcommand(subcommand);
	}

	private static buildSlashCommandOption(
		builder: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandBuilder,
		arg: ArgumentOptions,
	) {
		const setupOption = <T extends ApplicationCommandOptionBase>(option: T) => {
			return option
				.setName(arg.name)
				.setDescription(arg.description || arg.name)
				.setRequired(Boolean(arg.required));
		};

		switch (arg.type) {
			case ArgumentType.String: {
				builder.addStringOption((option) => setupOption(option));
				break;
			}

			case ArgumentType.Integer: {
				builder.addIntegerOption((option) => setupOption(option));
				break;
			}

			case ArgumentType.Number: {
				builder.addNumberOption((option) => setupOption(option));
				break;
			}

			case ArgumentType.User:
			case ArgumentType.Member: {
				builder.addUserOption((option) => setupOption(option));
				break;
			}
		}
	}
}
