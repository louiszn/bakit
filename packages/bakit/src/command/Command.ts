import { ConstructorLike } from "../base/BaseEntry.js";
import { BaseCommandEntryOptions, CreateCommandOptions, RootCommandEntry } from "./CommandEntry.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CommandAPI {
	const rootEntries = new WeakMap<ConstructorLike, RootCommandEntry>();

	export function use(root: RootCommandEntry) {
		return (target: ConstructorLike) => {
			root.setTarget(target);
			rootEntries.set(target, root);
		};
	}

	export function getRoot(constructor: ConstructorLike) {
		return rootEntries.get(constructor);
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
