import { BaseCommandEntryOptions, CreateCommandOptions, RootCommandEntry } from "./CommandEntry.js";

export type CommandConstructor = new (...args: unknown[]) => object;

const ROOT_KEY = Symbol("root");

function use(command: RootCommandEntry) {
	return (target: CommandConstructor) => {
		Reflect.defineMetadata(ROOT_KEY, command, target);
	};
}

function getRoot(constructor: CommandConstructor) {
	return Reflect.getMetadata(ROOT_KEY, constructor) as RootCommandEntry | undefined;
}

export function CommandFactory(options: CreateCommandOptions<BaseCommandEntryOptions> | string) {
	if (typeof options === "string") {
		options = { name: options };
	}

	if (!options.description) {
		options.description = options.name;
	}

	return new RootCommandEntry(options as BaseCommandEntryOptions);
}

export const Command = Object.assign(CommandFactory, {
	use,
	getRoot,
});
