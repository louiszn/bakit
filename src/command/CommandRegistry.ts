import {
	Collection,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import { CommandConstructor, UseCommandOptions } from "./command.js";
import { entry, Entry, EntryDecortatorType, GroupEntry } from "./entry/index.js";
import { Arg } from "./argument/index.js";

const OPTIONS_KEY = Symbol("options");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommandRegistry {
	public static commands = new Collection<string, CommandConstructor>();

	public static register(constructor: CommandConstructor, options: UseCommandOptions): void {
		this.setOptions(constructor, options);
	}

	public static add(constructor: CommandConstructor) {
		const options = this.getOptions(constructor);

		if (!options) {
			throw new Error(`"${constructor.name}" is not registered`);
		}

		this.commands.set(options.name, constructor);
	}

	public static getOptions(constructor: CommandConstructor): UseCommandOptions | undefined {
		return Reflect.getMetadata(OPTIONS_KEY, constructor) as UseCommandOptions | undefined;
	}

	public static setOptions(constructor: CommandConstructor, options: UseCommandOptions): void {
		Reflect.defineMetadata(OPTIONS_KEY, options, constructor);
	}

	public static getSlashCommandData(
		constructor: CommandConstructor,
	): RESTPostAPIApplicationCommandsJSONBody {
		const builder = new SlashCommandBuilder();

		const options = this.getOptions(constructor);

		if (!options) {
			throw new Error(`Missing command options for "${constructor.name}"`);
		}

		builder.setName(options.name);
		builder.setDescription(options.description || "");
		builder.setNSFW(Boolean(options.nsfw));

		this.buildCommandOptions(builder, constructor);

		return builder.toJSON();
	}

	private static buildCommandOptions(
		builder: SlashCommandBuilder,
		constructor: CommandConstructor,
	) {
		const hooks = Entry.getHooks(constructor).filter(
			(hook) => hook.type === EntryDecortatorType.Main,
		);

		const root = hooks.find((hook) => hook.entry === entry);
		const rootArgs = root ? Arg.getMethodArgs(root.method) : [];

		const groupHooks = hooks.filter((hook) => hook.entry instanceof GroupEntry);

		if (root && groupHooks.length === 1) {
			for (const arg of rootArgs) {
				this.addSlashCommandOption(builder, arg);
			}
		}

		for (const group of groupHooks) {
			let parentBuilder: SlashCommandBuilder | SlashCommandSubcommandGroupBuilder = builder;
			const parentArgs = [...rootArgs];

			if (group.entry !== entry) {
				parentBuilder = new SlashCommandSubcommandGroupBuilder()
					.setName(group.entry.name)
					.setDescription(group.entry.name);

				builder.addSubcommandGroup(parentBuilder);

				parentArgs.push(...Arg.getMethodArgs(group.method));
			}

			const subcommandHooks = hooks.filter((hook) => hook.entry.parent === group.entry);

			for (const subcommand of subcommandHooks) {
				const subcommandBuilder = new SlashCommandSubcommandBuilder()
					.setName(subcommand.entry.name)
					.setDescription(subcommand.entry.name);

				const args = [...parentArgs, ...Arg.getMethodArgs(subcommand.method)];

				for (const arg of args) {
					this.addSlashCommandOption(subcommandBuilder, arg);
				}

				parentBuilder.addSubcommand(subcommandBuilder);
			}
		}
	}

	private static addSlashCommandOption(
		builder: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandBuilder,
		arg: Arg.ArgOptions,
	) {
		switch (arg.type) {
			case Arg.ArgType.String:
				builder.addStringOption((opt) =>
					opt
						.setName(arg.name)
						.setDescription(arg.description || arg.name)
						.setRequired(Boolean(arg.required)),
				);
				break;
			case Arg.ArgType.Integer:
				builder.addIntegerOption((opt) =>
					opt
						.setName(arg.name)
						.setDescription(arg.description || arg.name)
						.setRequired(Boolean(arg.required)),
				);
				break;
			case Arg.ArgType.Number:
				builder.addNumberOption((opt) =>
					opt
						.setName(arg.name)
						.setDescription(arg.description || arg.name)
						.setRequired(Boolean(arg.required)),
				);
				break;
			case Arg.ArgType.User:
			case Arg.ArgType.Member:
				builder.addUserOption((opt) =>
					opt
						.setName(arg.name)
						.setDescription(arg.description || arg.name)
						.setRequired(Boolean(arg.required)),
				);
				break;
		}
	}
}
