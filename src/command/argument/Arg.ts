import { CommandHookMethod } from "../CommandEntry.js";
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
	public static string = Arg.createArgument<StringArgumentOptions>(ArgumentType.String);
	public static integer = Arg.createArgument<IntegerArgumentOptions>(ArgumentType.Integer);
	public static number = Arg.createArgument<NumberArgumentOptions>(ArgumentType.Number);
	public static user = Arg.createArgument<UserArgumentOptions>(ArgumentType.User);
	public static member = Arg.createArgument<MemberArgumentOptions>(ArgumentType.Member);

	public static getMethodArguments(method: CommandHookMethod): ArgumentOptions[] {
		return (Reflect.getMetadata(ARGS_KEY, method) as ArgumentOptions[] | undefined) ?? [];
	}

	public static setMethodArguments(method: CommandHookMethod, args: ArgumentOptions[]): void {
		Reflect.defineMetadata(ARGS_KEY, args, method);
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
					| CommandHookMethod
					| undefined;

				if (!method) {
					throw new Error("No method found");
				}

				const args = Arg.getMethodArguments(method);

				args.unshift(fullOptions);

				Arg.setMethodArguments(method, args);
			};
		};
	}
}
