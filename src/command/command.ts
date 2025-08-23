import { CommandRegistry } from "./CommandRegistry.js";

export interface UseCommandOptions {
	name: string;
	description?: string;
	nsfw?: boolean;
	guildIds?: string[];
}

export type CommandConstructor = new (...args: unknown[]) => unknown;

export function useCommand(options: string | UseCommandOptions) {
	if (typeof options === "string") {
		options = {
			name: options,
			description: `Command ${options}`,
		};
	}

	return function (constructor: CommandConstructor) {
		CommandRegistry.register(constructor, options);
	};
}
