import {
	Collection,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
} from "discord.js";
import { CommandConstructor, UseCommandOptions } from "./command.js";

const OPTIONS_KEY = Symbol("options");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommandRegistry {
	public static commands = new Collection<string, CommandConstructor>();

	public static register(constructor: CommandConstructor, options: UseCommandOptions): void {
		this.commands.set(options.name, constructor);
		this.setOptions(constructor, options);
	}

	public static getOptions(constructor: CommandConstructor): UseCommandOptions | undefined {
		return Reflect.getMetadata(OPTIONS_KEY, constructor) as UseCommandOptions | undefined;
	}

	public static setOptions(constructor: CommandConstructor, options: UseCommandOptions): void {
		Reflect.defineMetadata(OPTIONS_KEY, options, constructor);
	}

	private static getSlashCommandData(
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

		return builder.toJSON();
	}
}
