import { CommandHook } from "../CommandEntry.js";
import {
	ArgumentOptions,
	ArgumentType,
	IntegerArgumentOptions,
	MemberArgumentOptions,
	NumberArgumentOptions,
	StringArgumentOptions,
	UserArgumentOptions,
} from "./Argument.js";

const ARGS_KEY = Symbol("args");

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class Arg {
	private static cache = new WeakMap<CommandHook["method"], ArgumentOptions[]>();

	public static string = Arg.createArgument<StringArgumentOptions>(ArgumentType.String);
	public static integer = Arg.createArgument<IntegerArgumentOptions>(ArgumentType.Integer);
	public static number = Arg.createArgument<NumberArgumentOptions>(ArgumentType.Number);
	public static user = Arg.createArgument<UserArgumentOptions>(ArgumentType.User);
	public static member = Arg.createArgument<MemberArgumentOptions>(ArgumentType.Member);

	public static getMethodArguments(method: CommandHook["method"]): readonly ArgumentOptions[];
	public static getMethodArguments(method: CommandHook["method"], init: true): ArgumentOptions[];
	public static getMethodArguments(
		method: CommandHook["method"],
		init = false,
	): ArgumentOptions[] | readonly ArgumentOptions[] {
		let args =
			this.cache.get(method) ??
			(Reflect.getMetadata(ARGS_KEY, method) as ArgumentOptions[] | undefined);

		if (!args) {
			args = [];

			if (init) {
				Reflect.defineMetadata(ARGS_KEY, args, method);
				this.cache.set(method, args);
			}
		}

		return init ? args : Object.freeze([...args]);
	}

	public static format(arg: ArgumentOptions) {
		const { name, required, tuple } = arg;

		const opening = required ? "<" : "[";
		const closing = required ? ">" : "]";
		const prefix = tuple ? "..." : "";

		return `${opening}${prefix}${name}: ${this.describeArgumentExpectation(arg)}${closing}`;
	}

	public static describeArgumentExpectation(arg: ArgumentOptions): string {
		const parts: string[] = [arg.type];

		switch (arg.type) {
			case ArgumentType.String: {
				if (arg.minLength && !arg.maxLength) {
					parts.push(`≥ ${String(arg.minLength)}`);
				}

				if (!arg.minLength && arg.maxLength) {
					parts.push(`≤ ${String(arg.maxLength)}`);
				}
				if (arg.minLength && arg.maxLength) {
					parts.push(`${String(arg.minLength)} - ${String(arg.maxLength)}`);
				}

				break;
			}

			case ArgumentType.Number:
			case ArgumentType.Integer: {
				if (arg.minValue !== undefined && arg.maxValue === undefined) {
					parts.push(`≥ ${String(arg.minValue)}`);
				}

				if (arg.minValue === undefined && arg.maxValue !== undefined) {
					parts.push(`≤ ${String(arg.maxValue)}`);
				}

				if (arg.minValue !== undefined && arg.maxValue !== undefined) {
					parts.push(`${String(arg.minValue)} - ${String(arg.maxValue)}`);
				}

				break;
			}

			case ArgumentType.User:
			case ArgumentType.Member: {
				// No additional info
				break;
			}
		}

		return parts.join(", ");
	}

	protected static createArgument<Options extends ArgumentOptions>(type: Options["type"]) {
		return function (options: Omit<Options, "type"> | string) {
			const objOptions = typeof options === "string" ? { name: options } : options;
			const fullOptions = { ...objOptions, type } as ArgumentOptions;

			if (!fullOptions.description) {
				fullOptions.description = fullOptions.name;
			}

			if (!("required" in fullOptions)) {
				fullOptions.required = true;
			}

			return function (target: object, key: string | symbol, _index: number) {
				const method = Object.getOwnPropertyDescriptor(target, key)?.value as
					| CommandHook["method"]
					| undefined;

				if (!method) {
					throw new Error("No method found");
				}

				const args = Arg.getMethodArguments(method, true);

				args.unshift(fullOptions);
			};
		};
	}
}
