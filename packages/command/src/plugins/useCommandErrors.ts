import type { Promisable } from "type-fest";

import type { CommandPluginFactory } from "#/CommandRegistry";
import {
	CommandExecutionError,
	InvalidOptionSyntaxError,
	MissingParameterError,
	MissingSubcommandError,
	ParameterParseError,
	ParameterValidationError,
	UnexpectedArgumentError,
	UnknownCommandError,
	UnknownOptionError,
	UnknownSubcommandError,
} from "#/errors";

export interface CommandErrorsPluginOptions {
	onError?(error: unknown): Promisable<void>;

	onSyntaxError?(error: Error): Promisable<void>;

	onUnknownCommand?(error: UnknownCommandError): Promisable<void>;
	onUnknownSubcommand?(error: UnknownSubcommandError): Promisable<void>;
	onMissingSubcommand?(error: MissingSubcommandError): Promisable<void>;

	onUnknownOption?(error: UnknownOptionError): Promisable<void>;
	onInvalidOptionSyntax?(error: InvalidOptionSyntaxError): Promisable<void>;
	onUnexpectedArgument?(error: UnexpectedArgumentError): Promisable<void>;

	onMissingParameter?(error: MissingParameterError): Promisable<void>;
	onParameterParse?(error: ParameterParseError): Promisable<void>;
	onParameterValidation?(error: ParameterValidationError): Promisable<void>;

	onExecutionError?(error: CommandExecutionError): Promisable<void>;
}

export function useCommandErrors(options: CommandErrorsPluginOptions = {}): CommandPluginFactory {
	async function handleError(error: unknown): Promise<void> {
		await options.onError?.(error);

		if (error instanceof UnknownCommandError) {
			return options.onUnknownCommand?.(error);
		}

		if (error instanceof UnknownSubcommandError) {
			return options.onUnknownSubcommand?.(error);
		}

		if (error instanceof MissingSubcommandError) {
			return options.onMissingSubcommand?.(error);
		}

		if (error instanceof UnknownOptionError) {
			return options.onUnknownOption?.(error);
		}

		if (error instanceof InvalidOptionSyntaxError) {
			return options.onInvalidOptionSyntax?.(error);
		}

		if (error instanceof UnexpectedArgumentError) {
			return options.onUnexpectedArgument?.(error);
		}

		if (error instanceof MissingParameterError) {
			return options.onMissingParameter?.(error);
		}

		if (error instanceof ParameterParseError) {
			return options.onParameterParse?.(error);
		}

		if (error instanceof ParameterValidationError) {
			return options.onParameterValidation?.(error);
		}

		if (error instanceof CommandExecutionError) {
			return options.onExecutionError?.(error);
		}

		if (error instanceof Error) {
			return options.onSyntaxError?.(error);
		}
	}

	return () => ({
		parse: {
			onError(_context, error) {
				return handleError(error);
			},
		},
		invoke: {
			onError(_context, error) {
				return handleError(error);
			},
		},
	});
}
