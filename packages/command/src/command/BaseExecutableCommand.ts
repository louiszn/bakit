import type { Promisable } from "type-fest";

import type { CommandContext } from "#/context";
import type { Parameter } from "#/parameter";

export type ParameterMap = Record<string, Parameter>;

export type InferParameter<T> =
	T extends Parameter<infer Value, infer Required>
		? Required extends true
			? Value
			: Value | undefined
		: never;

export type InferParameters<T extends ParameterMap = ParameterMap> = {
	readonly [K in keyof T]: InferParameter<T[K]>;
};

export type CommandHandler<P extends ParameterMap = ParameterMap> = (
	context: CommandContext<InferParameters<P>>,
) => Promisable<void>;

export interface ExecutableCommandOptions<P extends ParameterMap = ParameterMap> {
	name: string;
	description?: string;
	parameters?: P;
	execute: CommandHandler<P>;
}

export class BaseExecutableCommand<P extends ParameterMap = ParameterMap> {
	readonly name: string;
	readonly description: string;
	readonly parameters: P;
	readonly execute: CommandHandler<P>;

	constructor(options: ExecutableCommandOptions<P>) {
		this.name = options.name;
		this.description = options.description ?? "command";
		this.parameters = options.parameters ?? ({} as P);

		for (const [name, parameter] of Object.entries(this.parameters)) {
			Object.defineProperty(parameter, "name", {
				value: parameter.name || name,
			});
		}

		this.execute = options.execute;
	}
}
