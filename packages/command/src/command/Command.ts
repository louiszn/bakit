import type { Promisable } from "type-fest";

import type { CommandContext } from "#/context";

export type CommandHandler = (context: CommandContext) => Promisable<void>;

export interface CommandOptions {
	name: string;
	description?: string;
	execute: CommandHandler;
}

export class Command {
	readonly name: string;
	readonly description: string;
	readonly execute: CommandHandler;

	constructor(options: CommandOptions) {
		this.name = options.name;
		this.description = options.description ?? `${options.name} command`;
		this.execute = options.execute;
	}
}

export function useCommand(options: CommandOptions) {
	return new Command(options);
}
