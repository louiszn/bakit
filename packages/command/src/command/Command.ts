import type { Promisable } from "type-fest";

import type { CommandContext } from "#/context";
import type { BaseParameter } from "#/parameter";

// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export type ParameterMap = Record<string, BaseParameter<any, any>>;

// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export type InferParameter<T> = T extends BaseParameter<infer Value, any> ? Value : never;
export type InferParameters<T extends ParameterMap> = {
	readonly [K in keyof T]: InferParameter<T[K]>;
};

export type CommandHandler<P extends ParameterMap = ParameterMap> = (
	context: CommandContext<InferParameters<P>>,
) => Promisable<void>;

export interface CommandOptions<P extends ParameterMap = ParameterMap> {
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
		this.execute = options.execute;
	}
}

export function useCommand<P extends ParameterMap>(options: CommandOptions<P>) {
	return new Command(options);
}
