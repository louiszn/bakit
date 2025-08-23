import { Awaitable } from "discord.js";

export enum EntryDecortatorType {
	Main = "main",
	Pre = "pre",
	Post = "post",
	Error = "error",
}

export type CommandHookMethod = (...args: unknown[]) => Awaitable<void>;

export interface CommandHook {
	type: EntryDecortatorType;
	method: CommandHookMethod;
	entry: Entry;
}

export class Entry {
	public metaKey: symbol;

	public constructor(public name: string) {
		this.metaKey = Symbol(name);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	private static getHooks(key: symbol, constructor: Function): CommandHook[] {
		return (Reflect.getMetadata(key, constructor) as CommandHook[] | undefined) ?? [];
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	private static setHooks(key: symbol, hooks: CommandHook[], constructor: Function): void {
		Reflect.defineMetadata(key, hooks, constructor);
	}

	private makeDecorator(type: EntryDecortatorType) {
		const { metaKey } = this;

		const entry = this as Entry;

		return () => {
			return function <T extends CommandHookMethod>(
				target: object,
				_key: string,
				descriptor: TypedPropertyDescriptor<T>,
			) {
				const { constructor } = target;

				const hooks = Entry.getHooks(metaKey, constructor);

				const { value: method } = descriptor;

				if (typeof method !== "function") {
					throw new Error("Entry decorator must be used with a class method.");
				}

				hooks.push({
					type,
					method,
					entry,
				});

				Entry.setHooks(metaKey, hooks, constructor);
			};
		};
	}

	public main = this.makeDecorator(EntryDecortatorType.Main);
	public pre = this.makeDecorator(EntryDecortatorType.Pre);
	public post = this.makeDecorator(EntryDecortatorType.Post);
	public error = this.makeDecorator(EntryDecortatorType.Error);
}
