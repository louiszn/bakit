import { ConstructorLike } from "../base/BaseEntry.js";
import { BaseCommandEntryOptions, CreateCommandOptions, RootCommandEntry } from "./CommandEntry.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CommandAPI {
	const ROOT_KEY = Symbol("root");

	export function use(command: RootCommandEntry) {
		return (target: ConstructorLike) => {
			command.setTarget(target);
			Reflect.defineMetadata(ROOT_KEY, command, target);
		};
	}

	export function getRoot(constructor: ConstructorLike) {
		return Reflect.getMetadata(ROOT_KEY, constructor) as RootCommandEntry | undefined;
	}
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

export const Command = Object.assign(CommandFactory, CommandAPI);
