import type { RootCommand, SubcommandGroup } from "#/command";

import { CommandError, type CommandErrorOptions } from "./CommandError";

export class CommandSyntaxError extends CommandError {}

export class UnknownCommandError extends CommandSyntaxError {
	readonly command: string;

	constructor(command: string, options?: CommandErrorOptions) {
		super(`Unknown command '${command}'.`, options);

		this.command = command;
	}
}

export class MissingSubcommandError extends CommandSyntaxError {
	readonly parent: RootCommand | SubcommandGroup;

	constructor(parent: RootCommand | SubcommandGroup, options?: CommandErrorOptions) {
		super(`Missing subcommand for '${parent.name}'.`, options);

		this.parent = parent;
	}
}

export class UnknownSubcommandError extends CommandSyntaxError {
	readonly parent: RootCommand | SubcommandGroup;
	readonly subcommand: string;

	constructor(
		parent: RootCommand | SubcommandGroup,
		subcommand: string,
		options?: CommandErrorOptions,
	) {
		super(`Unknown subcommand '${subcommand}' for '${parent.name}'.`, options);

		this.parent = parent;
		this.subcommand = subcommand;
	}
}

export class UnexpectedArgumentError extends CommandSyntaxError {
	readonly argument: string;

	constructor(argument: string, options?: CommandErrorOptions) {
		super(`Unexpected positional argument '${argument}'.`, options);

		this.argument = argument;
	}
}

export class UnknownOptionError extends CommandSyntaxError {
	readonly option: string;

	constructor(option: string, options?: CommandErrorOptions) {
		super(`Unknown option '--${option}'.`, options);

		this.option = option;
	}
}

export class InvalidOptionSyntaxError extends CommandSyntaxError {
	readonly option: string;

	constructor(option: string, options: CommandErrorOptions) {
		super(`Invalid option '${option}'.`, options);

		this.option = option;
	}
}
