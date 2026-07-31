import type { Promisable } from "type-fest";

import type { CommandContext } from "#/context";
import type { BaseParameter } from "#/parameter";

// biome-ignore lint/suspicious/noExplicitAny: Accept various parameter types
export type ParameterMap = Record<string, BaseParameter<any, any>>;

export type InferParameter<T> =
	T extends BaseParameter<infer Value, infer Options>
		? Options extends { required: true }
			? Value
			: Value | undefined
		: never;

export type InferParameters<T extends ParameterMap> = {
	readonly [K in keyof T]: InferParameter<T[K]>;
};

export type CommandHandler<P extends ParameterMap> = (
	context: CommandContext<InferParameters<P>>,
) => Promisable<void>;

export interface CommandOptions<P extends ParameterMap> {
	name: string;
	description?: string;
	parameters?: P;
	execute: CommandHandler<P>;
}

export class Command<P extends ParameterMap = ParameterMap> {
	readonly name: string;
	readonly description: string;
	readonly parameters: P;
	readonly execute: CommandHandler<P>;

	constructor(options: CommandOptions<P>) {
		this.name = options.name;
		this.description = options.description ?? `${options.name} command`;
		this.parameters = (options.parameters ?? {}) as P;

		for (const [name, parameter] of Object.entries(this.parameters)) {
			if (!parameter.options.name) {
				parameter.options.name = name;
			}
		}

		this.execute = options.execute;
	}
}

export function useCommand<const P extends ParameterMap>(options: CommandOptions<P>) {
	return new Command(options);
}
