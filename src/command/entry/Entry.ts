import { Awaitable } from "discord.js";
import { Context } from "../Context.js";
import { GroupEntry } from "./GroupEntry.js";

export enum EntryDecortatorType {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandHookMethod = (ctx: Context, ...args: any[]) => Awaitable<void>;

export interface CommandHook {
	type: EntryDecortatorType;
	method: CommandHookMethod;
	entry: Entry;
}

export const HOOKS_KEY = Symbol("hooks");

export class Entry {
	public main: ReturnType<Entry["makeDecorator"]>;
	public pre: ReturnType<Entry["makeDecorator"]>;
	public post: ReturnType<Entry["makeDecorator"]>;
	public error: ReturnType<Entry["makeDecorator"]>;

	public constructor(
		public name: string,
		public parent?: GroupEntry,
	) {
		this.main = this.makeDecorator(EntryDecortatorType.Main);
		this.pre = this.makeDecorator(EntryDecortatorType.Pre);
		this.post = this.makeDecorator(EntryDecortatorType.Post);
		this.error = this.makeDecorator(EntryDecortatorType.Error);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public static getHooks(constructor: Function): CommandHook[] {
		return (Reflect.getMetadata(HOOKS_KEY, constructor) as CommandHook[] | undefined) ?? [];
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	public static setHooks(hooks: CommandHook[], constructor: Function): void {
		Reflect.defineMetadata(HOOKS_KEY, hooks, constructor);
	}

	private makeDecorator(type: EntryDecortatorType) {
		const entry = this as Entry;

		return () => {
			return function (
				target: object,
				_key: string,
				descriptor: TypedPropertyDescriptor<CommandHookMethod>,
			) {
				const { constructor } = target;

				const hooks = Entry.getHooks(constructor);

				const { value: method } = descriptor;

				if (typeof method !== "function") {
					throw new Error("Entry decorator must be used with a class method.");
				}

				hooks.push({
					type,
					method,
					entry,
				});

				Entry.setHooks(hooks, constructor);
			};
		};
	}
}
