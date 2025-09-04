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

import { Command } from "./Command.js";
import { RootCommandEntry } from "./CommandEntry.js";
import { Arg, ArgumentOptions, ArgumentType } from "./argument/index.js";
import { CommandGroupEntry, SubcommandEntry } from "./CommandEntry.js";
import { ConstructorLike, HookExecutionState } from "../base/BaseEntry.js";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommandRegistry {
	public static constructors = new Collection<string, ConstructorLike>();
	public static instances = new Collection<string, object>();

	/**
	 * Add a command to the registry.
	 * @param constructor The command class you want to add.
	 */
	public static add(constructor: ConstructorLike) {
		const root = Command.getRoot(constructor);

		if (!root) {
			throw new Error(`No root found for "${constructor.name}"`);
		}

		const { options } = root;

		this.constructors.set(options.name, constructor);
		this.instances.set(options.name, new constructor());
	}

	/**
	 * Load and add all commands which matched provided glob pattern to the registry.
	 * @param pattern glob pattern to load.
	 * @param parallel load all matched results in parallel, enabled by default.
	 * @returns All loaded command constructors.
	 */
	public static async load(pattern: string, parallel = true): Promise<ConstructorLike[]> {
		const files = await glob(pattern);

		const loaders = files.map(async (file) => {
			const fileURL = pathToFileURL(file).toString();

			const { default: constructor } = (await import(fileURL)) as {
				default: ConstructorLike;
			};

			CommandRegistry.add(constructor);

			return constructor;
		});

		if (parallel) {
			return await Promise.all(loaders);
		}

		const result: ConstructorLike[] = [];

		for (const loader of loaders) {
			result.push(await loader);
		}

		return result;
	}

	/**
	 * Build a command into application command data.
	 * @param constructor The command class you want to build.
	 * @returns a REST JSON version of the application command data.
	 */
	public static buildSlashCommand(
		constructor: ConstructorLike,
	): RESTPostAPIApplicationCommandsJSONBody {
		const root = Command.getRoot(constructor);

		if (!root) {
			throw new Error(`No root found for "${constructor.name}"`);
		}

		const { options } = root;

		const builder = new SlashCommandBuilder()
			.setName(options.name)
			.setDescription(options.description)
			.setNSFW(Boolean(options.nsfw));

		const args = this.getMainHookArguments(root);

		if (root.children.size) {
			this.buildSlashCommandSubcommands(builder, root, args);
		} else {
			this.buildSlashCommandOptions(builder, args);
		}

		return builder.toJSON();
	}

	private static getMainHookArguments(
		entry: RootCommandEntry | CommandGroupEntry | SubcommandEntry,
	) {
		const { hooks } = entry;
		const mainHook = hooks[HookExecutionState.Main];
		return mainHook ? Arg.getMethodArguments(mainHook.method) : [];
	}

	private static buildSlashCommandSubcommands(
		parent: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder,
		entry: RootCommandEntry | CommandGroupEntry,
		inheritedArgs: readonly ArgumentOptions[],
	) {
		const { children } = entry;

		for (const child of children.values()) {
			if (child instanceof CommandGroupEntry && parent instanceof SlashCommandBuilder) {
				const { options } = child;

				const group = new SlashCommandSubcommandGroupBuilder()
					.setName(options.name)
					.setDescription(options.description);

				// Group must have subcommands
				this.buildSlashCommandSubcommands(group, child, [
					...inheritedArgs,
					...this.getMainHookArguments(child),
				]);

				parent.addSubcommandGroup(group);
			} else if (child instanceof SubcommandEntry) {
				const { options } = child;

				const subcommand = new SlashCommandSubcommandBuilder()
					.setName(options.name)
					.setDescription(options.description);

				this.buildSlashCommandOptions(subcommand, [
					...inheritedArgs,
					...this.getMainHookArguments(child),
				]);

				parent.addSubcommand(subcommand);
			}
		}
	}

	private static buildSlashCommandOptions(
		builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
		args: readonly ArgumentOptions[],
	) {
		// Required options must be added first
		const argGroup = Object.groupBy(args, ({ required }) => (required ? "required" : "optional"));
		const orderedArgs = [...(argGroup.required || []), ...(argGroup.optional || [])];

		for (const arg of orderedArgs) {
			this.attachSlashCommandOption(builder, arg);
		}
	}

	private static attachSlashCommandOption(
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
				builder.addStringOption((data) => {
					const option = setupOption(data);

					if (arg.maxLength) {
						option.setMaxLength(arg.maxLength);
					}

					if (arg.minLength) {
						option.setMinLength(arg.minLength);
					}

					return option;
				});

				break;
			}

			case ArgumentType.Integer: {
				builder.addIntegerOption((data) => {
					const option = setupOption(data);

					if (arg.maxValue) {
						option.setMaxValue(arg.maxValue);
					}

					if (arg.minValue) {
						option.setMinValue(arg.minValue);
					}

					return option;
				});

				break;
			}

			case ArgumentType.Number: {
				builder.addNumberOption((data) => {
					const option = setupOption(data);

					if (arg.maxValue) {
						option.setMaxValue(arg.maxValue);
					}

					if (arg.minValue) {
						option.setMinValue(arg.minValue);
					}

					return option;
				});

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
