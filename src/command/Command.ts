import { BaseCommandEntryOptions, CreateOptions, RootCommandEntry } from "./CommandEntry.js";

export type CommandConstructor = new (...args: unknown[]) => object;

const ROOT_KEY = Symbol("root");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Command {
	public static create(options: CreateOptions<BaseCommandEntryOptions>) {
		if (typeof options === "string") {
			options = { name: options };
		}

		if (!options.description) {
			options.description = options.name;
		}

		return new RootCommandEntry(options as BaseCommandEntryOptions);
	}

	public static use(command: RootCommandEntry) {
		return (target: CommandConstructor) => {
			Reflect.defineMetadata(ROOT_KEY, command, target);
		};
	}

	public static getRoot(constructor: CommandConstructor) {
		return Reflect.getMetadata(ROOT_KEY, constructor) as RootCommandEntry | undefined;
	}
}
