import { Collection } from "discord.js";
import {
	BaseEntry,
	BaseErrorHookMethod,
	BaseHook,
	BaseMainHookMethod,
	ConstructorLike,
} from "../base/BaseEntry.js";
import { Context } from "./Context.js";
import { SetOptional } from "type-fest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MainCommandHookMethod = BaseMainHookMethod<[context: Context, ...args: any[]]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorCommandHookMethod = BaseErrorHookMethod<[context: Context, ...args: any[]]>;

export interface CommandHook extends BaseHook {
	method: MainCommandHookMethod | ErrorCommandHookMethod;
}

export interface BaseCommandEntryOptions {
	name: string;
	description: string;
	nsfw?: boolean;
}

export type CreateCommandOptions<T extends BaseCommandEntryOptions> =
	| SetOptional<T, "description">
	| string;

export class BaseCommandEntry extends BaseEntry<
	ConstructorLike,
	CommandHook,
	MainCommandHookMethod,
	ErrorCommandHookMethod
> {
	public constructor(public options: BaseCommandEntryOptions) {
		super();
	}
}

export class BaseCommandGroupEntry extends BaseCommandEntry {
	public children = new Collection<string, CommandGroupEntry | SubcommandEntry>();

	public subcommand(options: CreateCommandOptions<BaseCommandEntryOptions>) {
		const fullOptions: BaseCommandEntryOptions =
			typeof options === "string"
				? { name: options, description: `${options} command` }
				: { description: `${options.name} command`, ...options };

		if (this.children.has(fullOptions.name)) {
			throw new Error(`Entry "${fullOptions.name}" is already existed.`);
		}

		const subcommand = new SubcommandEntry(fullOptions, this);

		this.children.set(fullOptions.name, subcommand);

		return subcommand;
	}
}

export class RootCommandEntry extends BaseCommandGroupEntry {
	public group(options: CreateCommandOptions<BaseCommandEntryOptions>) {
		const fullOptions: BaseCommandEntryOptions =
			typeof options === "string"
				? { name: options, description: `${options} command` }
				: { description: `${options.name} command`, ...options };

		if (this.children.has(fullOptions.name)) {
			throw new Error(`Entry "${fullOptions.name}" is already existed.`);
		}

		const group = new CommandGroupEntry(fullOptions, this);

		this.children.set(fullOptions.name, group);

		return group;
	}
}

export class CommandGroupEntry extends BaseCommandGroupEntry {
	declare public children: Collection<string, SubcommandEntry>;

	public constructor(
		options: BaseCommandEntryOptions,
		public parent: RootCommandEntry,
	) {
		super(options);
	}
}

export class SubcommandEntry extends BaseCommandEntry {
	public constructor(
		options: BaseCommandEntryOptions,
		public parent: BaseCommandGroupEntry,
	) {
		super(options);
	}
}
