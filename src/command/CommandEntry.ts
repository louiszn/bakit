import { Awaitable, Collection } from "discord.js";
import { Context } from "./Context.js";

import type { SetOptional } from "type-fest";
import { CommandConstructor } from "./Command.js";
import { Arg } from "./argument/Arg.js";

export enum HookExecutionState {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandHookMethod = (ctx: Context, ...args: any[]) => Awaitable<void>;

export interface CommandHook {
	state: HookExecutionState;
	method: CommandHookMethod;
	entry: CommandEntry;
}

export interface BaseCommandEntryOptions {
	name: string;
	description: string;
	nsfw?: boolean;
}

export type CreateOptions<T extends BaseCommandEntryOptions> =
	| SetOptional<T, "description">
	| string;

export const HOOKS_KEY = Symbol("hooks");

export abstract class BaseCommandEntry {
	private static cache = new WeakMap<CommandConstructor, CommandHook[]>();

	public main = BaseCommandEntry.createMainHookDecorator(HookExecutionState.Main, this);
	public pre = BaseCommandEntry.createMainHookDecorator(HookExecutionState.Pre, this);
	public post = BaseCommandEntry.createMainHookDecorator(HookExecutionState.Post, this);
	public error = BaseCommandEntry.createErrorHookDecorator(HookExecutionState.Error, this);

	public constructor(public options: BaseCommandEntryOptions) {}

	public static getHooks(constructor: CommandConstructor): readonly CommandHook[];
	public static getHooks(constructor: CommandConstructor, init: true): CommandHook[];
	public static getHooks(
		constructor: CommandConstructor,
		init = false,
	): CommandHook[] | readonly CommandHook[] {
		let hooks =
			this.cache.get(constructor) ??
			(Reflect.getMetadata(HOOKS_KEY, constructor) as CommandHook[] | undefined);

		if (!hooks) {
			hooks = [];

			if (init) {
				Reflect.defineMetadata(HOOKS_KEY, hooks, constructor);
				this.cache.set(constructor, hooks);
			}
		}

		return init ? hooks : Object.freeze([...hooks]);
	}

	private static createMainHookDecorator(
		state: HookExecutionState.Main | HookExecutionState.Pre | HookExecutionState.Post,
		entry: BaseCommandEntry,
	) {
		return <T extends CommandHookMethod>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry as CommandEntry);
		};
	}

	private static createErrorHookDecorator(
		state: HookExecutionState.Error,
		entry: BaseCommandEntry,
	) {
		return <T extends CommandHookMethod>(
			target: object,
			_key: string,
			descriptor: TypedPropertyDescriptor<T>,
		) => {
			this.addHook(target, state, descriptor.value, entry as CommandEntry);
		};
	}

	private static addHook(
		target: object,
		state: HookExecutionState,
		method: CommandHookMethod | undefined,
		entry: CommandEntry,
	) {
		const { constructor } = target;
		const hooks = BaseCommandEntry.getHooks(constructor as CommandConstructor, true);

		if (typeof method !== "function") {
			throw new Error("CommandEntry decorator must be used with a class method.");
		}

		if (hooks.some((hook) => hook.state === state && hook.entry === entry)) {
			throw new Error(`Hook "${state}" is already defined for entry "${entry.options.name}".`);
		}

		if ("parent" in entry) {
			const parentHook = hooks.find(
				(hook) => hook.entry === entry.parent && hook.state === HookExecutionState.Main,
			);

			if (parentHook) {
				const parentArgs = Arg.getMethodArguments(parentHook.method);

				if (parentArgs.at(-1)?.tuple) {
					throw new Error(
						`Cannot add hook "${state}" to entry "${entry.options.name}" because its parent "${entry.parent.options.name}" has a tuple argument.`,
					);
				}
			}
		}

		hooks.push({
			state,
			entry,
			method,
		} as CommandHook);
	}
}

export abstract class BaseCommandGroupEntry extends BaseCommandEntry {
	public children = new Collection<string, SubcommandEntry | CommandGroupEntry>();

	public subcommand(options: CreateOptions<BaseCommandEntryOptions>): SubcommandEntry {
		if (typeof options === "string") {
			options = { name: options };
		}

		if (!options.description) {
			options.description = options.name;
		}

		if (this.children.has(options.name)) {
			throw new Error(`Entry with name "${options.name}" already exists.`);
		}

		if (!(this instanceof CommandGroupEntry) && !(this instanceof RootCommandEntry)) {
			throw new Error(`Invalid parent "${this.constructor.name}"`);
		}

		const entry = new SubcommandEntry(options as BaseCommandEntryOptions, this);

		this.children.set(entry.options.name, entry);

		return entry;
	}
}

export class CommandGroupEntry extends BaseCommandGroupEntry {
	declare public children: Collection<string, SubcommandEntry>;

	public constructor(
		public options: BaseCommandEntryOptions,
		public parent: RootCommandEntry,
	) {
		super(options);
	}
}

export class RootCommandEntry extends BaseCommandGroupEntry {
	public constructor(public options: BaseCommandEntryOptions) {
		super(options);
	}

	public group(options: CreateOptions<BaseCommandEntryOptions>): CommandGroupEntry {
		if (typeof options === "string") {
			options = { name: options };
		}

		if (!options.description) {
			options.description = options.name;
		}

		if (this.children.has(options.name)) {
			throw new Error(`Entry with name "${options.name}" already exists.`);
		}

		const entry = new CommandGroupEntry(options as BaseCommandEntryOptions, this);

		this.children.set(entry.options.name, entry);

		return entry;
	}
}

export class SubcommandEntry extends BaseCommandEntry {
	public constructor(
		public options: BaseCommandEntryOptions,
		public parent: RootCommandEntry | CommandGroupEntry,
	) {
		super(options);
	}
}

export type CommandEntry = RootCommandEntry | CommandGroupEntry | SubcommandEntry;
