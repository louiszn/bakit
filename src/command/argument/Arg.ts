import { CommandHookMethod } from "../entry/index.js";

export enum ArgType {
	String = "string",
	Integer = "integer",
	Number = "number",
	User = "user",
	Member = "member",
}

export interface BaseArgOptions {
	type: ArgType;
	name: string;
	description?: string;
	required?: boolean;
}

export interface StringArgOptions extends BaseArgOptions {
	type: ArgType.String;
}

export interface IntegerArgOptions extends BaseArgOptions {
	type: ArgType.Integer;
}

export interface NumberArgOptions extends BaseArgOptions {
	type: ArgType.Number;
}

export interface UserArgOptions extends BaseArgOptions {
	type: ArgType.User;
}

export interface MemberArgOptions extends BaseArgOptions {
	type: ArgType.Member;
}

export type ArgOptions =
	| StringArgOptions
	| IntegerArgOptions
	| NumberArgOptions
	| UserArgOptions
	| MemberArgOptions;

const ARGS_KEY = Symbol("args");

export function getMethodArgs(method: CommandHookMethod): ArgOptions[] {
	return (Reflect.getMetadata(ARGS_KEY, method) as ArgOptions[] | undefined) ?? [];
}

export function setMethodArgs(method: CommandHookMethod, args: ArgOptions[]): void {
	Reflect.defineMetadata(ARGS_KEY, args, method);
}

export function createArg<Options extends ArgOptions>(type: Options["type"]) {
	return function (options: Omit<Options, "type"> | string) {
		const objOptions = typeof options === "string" ? { name: options } : options;
		const fullOptions = { ...objOptions, type } as ArgOptions;

		if (!fullOptions.description) {
			fullOptions.description = fullOptions.name;
		}

		return function (target: object, key: string | symbol, _index: number) {
			const method = Object.getOwnPropertyDescriptor(target, key)?.value as
				| CommandHookMethod
				| undefined;

			if (!method) {
				throw new Error("No method found");
			}

			const args = getMethodArgs(method);

			args.unshift(fullOptions);

			setMethodArgs(method, args);
		};
	};
}

export const string = createArg<StringArgOptions>(ArgType.String);
export const integer = createArg<IntegerArgOptions>(ArgType.Integer);
export const number = createArg<NumberArgOptions>(ArgType.Number);
export const user = createArg<UserArgOptions>(ArgType.User);
export const member = createArg<MemberArgOptions>(ArgType.Member);
