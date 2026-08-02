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

export interface ExecutableCommand<P extends ParameterMap = ParameterMap> {
	readonly name: string;
	readonly description: string;
	readonly execute: CommandHandler<P>;
}
