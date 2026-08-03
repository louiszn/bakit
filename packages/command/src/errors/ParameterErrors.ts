import type { Parameter } from "#/parameter";

import { CommandError, type CommandErrorOptions } from "./CommandError";

export class ParameterError extends CommandError {
	readonly parameter: Parameter;

	constructor(message: string, parameter: Parameter, options?: CommandErrorOptions) {
		super(message, options);

		this.parameter = parameter;
	}
}

export class MissingParameterError extends ParameterError {
	constructor(parameter: Parameter, options?: CommandErrorOptions) {
		super(`Missing required parameter '${parameter.name}'.`, parameter, options);
	}
}

export class ParameterParseError extends ParameterError {
	constructor(parameter: Parameter, cause: unknown, options?: CommandErrorOptions) {
		super(`Failed to parse parameter '${parameter.name}'.`, parameter, {
			...options,
			cause,
		});
	}
}

export class ParameterValidationError extends ParameterError {
	constructor(parameter: Parameter, cause: unknown, options?: CommandErrorOptions) {
		super(`Parameter '${parameter.name}' is invalid.`, parameter, {
			...options,
			cause,
		});
	}
}
