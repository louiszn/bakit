import { Awaitable, Collection } from "discord.js";
import { Context } from "./Context.js";

import type { SetOptional } from "type-fest";
import { CommandConstructor } from "./Command.js";

export enum HookExecutionState {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

export interface CommandHook {
	state: HookExecutionState;
	method: CommandHookMethod;
	entry: CommandEntry;
}

export type CommandHookMethod = (ctx: Context, ...args: never[]) => Awaitable<void>;

export interface RootCommandEntryOptions {
	name: string;
	description: string;
	nsfw?: boolean;
}

export interface SubcommandEntryOptions {
	name: string;
	description: string;
}

export interface CommandGroupEntryOptions {
	name: string;
	description: string;
}

export type RootCommandEntryCreateOptions = SetOptional<RootCommandEntryOptions, "description">;
export type SubcommandEntryCreateOptions = SetOptional<SubcommandEntryOptions, "description">;
export type CommandGroupEntryCreateOptions = SetOptional<CommandGroupEntryOptions, "description">;

export const HOOKS_KEY = Symbol("hooks");

export abstract class BaseCommandEntry {
	public main = BaseCommandEntry.createHookDecorator(HookExecutionState.Main, this);
	public pre = BaseCommandEntry.createHookDecorator(HookExecutionState.Pre, this);
	public post = BaseCommandEntry.createHookDecorator(HookExecutionState.Post, this);
	public error = BaseCommandEntry.createHookDecorator(HookExecutionState.Error, this);

	public static getHooks(constructor: CommandConstructor): readonly CommandHook[];
	public static getHooks(constructor: CommandConstructor, init: true): CommandHook[];
	public static getHooks(
		constructor: CommandConstructor,
		init = false,
	): CommandHook[] | readonly CommandHook[] {
		let hooks = Reflect.getMetadata(HOOKS_KEY, constructor) as CommandHook[] | undefined;

		if (!hooks && init) {
			hooks = [];
			Reflect.defineMetadata(HOOKS_KEY, hooks, constructor);
		}

		return hooks ?? Object.freeze([]);
	}

	protected static createHookDecorator(state: HookExecutionState, entry: BaseCommandEntry) {
		return <T extends CommandHookMethod>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			const { constructor } = target;

			const hooks = BaseCommandEntry.getHooks(constructor as CommandConstructor, true);

			const { value: method } = descriptor;

			if (typeof method !== "function") {
				throw new Error("CommandEntry decorator must be used with a class method.");
			}

			hooks.push({ state, entry: entry as CommandEntry, method });
		};
	}
}

export abstract class BaseCommandGroupEntry extends BaseCommandEntry {
	public children = new Collection<string, SubcommandEntry | CommandGroupEntry>();

	public createSubcommand(options: SubcommandEntryCreateOptions | string): SubcommandEntry {
		if (typeof options === "string") {
			options = { name: options };
		}

		if (!options.description) {
			options.description = options.name;
		}

		if (!(this instanceof CommandGroupEntry) && !(this instanceof RootCommandEntry)) {
			throw new Error(`Invalid parent "${this.constructor.name}"`);
		}

		const entry = new SubcommandEntry(options as SubcommandEntryOptions, this);

		this.children.set(entry.options.name, entry);

		return entry;
	}
}

export class CommandGroupEntry extends BaseCommandGroupEntry {
	declare public children: Collection<string, SubcommandEntry>;

	public constructor(
		public options: CommandGroupEntryOptions,
		public parent: RootCommandEntry,
	) {
		super();
	}
}

export class RootCommandEntry extends BaseCommandGroupEntry {
	public constructor(public options: RootCommandEntryOptions) {
		super();
	}

	public createGroup(options: CommandGroupEntryCreateOptions | string): CommandGroupEntry {
		if (typeof options === "string") {
			options = { name: options };
		}

		if (!options.description) {
			options.description = options.name;
		}

		const entry = new CommandGroupEntry(options as CommandGroupEntryOptions, this);

		this.children.set(entry.options.name, entry);

		return entry;
	}
}

export class SubcommandEntry extends BaseCommandEntry {
	public constructor(
		public options: SubcommandEntryOptions,
		public parent: RootCommandEntry | CommandGroupEntry,
	) {
		super();
	}
}

export type CommandEntry = RootCommandEntry | CommandGroupEntry | SubcommandEntry;
