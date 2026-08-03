import {
	BooleanParameter,
	Command,
	type CommandTree,
	IntegerParameter,
	NumberParameter,
	type Parameter,
	type RootCommand,
	StringParameter,
	type Subcommand,
	type SubcommandGroup,
} from "@bakit/command";
import {
	type APIApplicationCommandBasicOption,
	type APIApplicationCommandBooleanOption,
	type APIApplicationCommandIntegerOption,
	type APIApplicationCommandNumberOption,
	type APIApplicationCommandStringOption,
	type APIApplicationCommandSubcommandGroupOption,
	type APIApplicationCommandSubcommandOption,
	ApplicationCommandOptionType,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "bakit/discord-types";

function transformParameter(parameter: Parameter): APIApplicationCommandBasicOption {
	const base = {
		name: parameter.name,
		description: parameter.description,
		required: parameter.required,
	};

	if (parameter instanceof StringParameter) {
		const option: APIApplicationCommandStringOption = {
			type: ApplicationCommandOptionType.String,
			...base,
		};

		if (parameter.minLength !== undefined) {
			option.min_length = parameter.minLength;
		}

		if (parameter.maxLength !== undefined) {
			option.max_length = parameter.maxLength;
		}

		return option;
	}

	if (parameter instanceof IntegerParameter) {
		const option: APIApplicationCommandIntegerOption = {
			type: ApplicationCommandOptionType.Integer,
			...base,
		};

		if (parameter.min !== undefined) {
			option.min_value = parameter.min;
		}

		if (parameter.max !== undefined) {
			option.max_value = parameter.max;
		}

		return option;
	}

	if (parameter instanceof NumberParameter) {
		const option: APIApplicationCommandNumberOption = {
			type: ApplicationCommandOptionType.Number,
			...base,
		};

		if (parameter.min !== undefined) {
			option.min_value = parameter.min;
		}

		if (parameter.max !== undefined) {
			option.max_value = parameter.max;
		}

		return option;
	}

	if (parameter instanceof BooleanParameter) {
		const option: APIApplicationCommandBooleanOption = {
			type: ApplicationCommandOptionType.Boolean,
			...base,
		};

		return option;
	}

	throw new TypeError(`Unsupported parameter type: ${parameter.constructor.name}`);
}

function transformParameters(
	parameters: Record<string, Parameter>,
): APIApplicationCommandBasicOption[] {
	return Object.values(parameters).map(transformParameter);
}

function transformSubcommand(command: Subcommand): APIApplicationCommandSubcommandOption {
	return {
		type: ApplicationCommandOptionType.Subcommand,
		name: command.name,
		description: command.description,
		options: transformParameters(command.parameters),
	};
}

function transformGroup(group: SubcommandGroup): APIApplicationCommandSubcommandGroupOption {
	return {
		type: ApplicationCommandOptionType.SubcommandGroup,
		name: group.name,
		description: group.description,
		options: [...group.commands.values()].map(transformSubcommand),
	};
}

function transformTree(command: CommandTree): RESTPostAPIApplicationCommandsJSONBody {
	return {
		name: command.name,
		description: command.description,
		options: [
			...[...command.groups.values()].map(transformGroup),
			...[...command.commands.values()].map(transformSubcommand),
		],
	};
}

function transformCommand(command: Command): RESTPostAPIApplicationCommandsJSONBody {
	return {
		name: command.name,
		description: command.description,
		options: transformParameters(command.parameters),
	};
}

export function transformRootCommand(command: RootCommand): RESTPostAPIApplicationCommandsJSONBody {
	if (command instanceof Command) {
		return transformCommand(command);
	}

	return transformTree(command);
}

export function transformCommands(
	commands: Iterable<RootCommand>,
): RESTPostAPIApplicationCommandsJSONBody[] {
	return [...commands].map(transformRootCommand);
}
