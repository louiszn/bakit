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

const store = new WeakMap<CommandHook["method"], ArgumentOptions[]>();

function getMethodArguments(method: CommandHook["method"]): readonly ArgumentOptions[];
function getMethodArguments(method: CommandHook["method"], init: true): ArgumentOptions[];
function getMethodArguments(
	method: CommandHook["method"],
	init = false,
): ArgumentOptions[] | readonly ArgumentOptions[] {
	let args = store.get(method);

	if (!args) {
		args = [];

		if (init) {
			store.set(method, args);
		}
	}

	return init ? args : Object.freeze([...args]);
}

function createArgument<Options extends ArgumentOptions>(type: Options["type"]) {
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

			const args = getMethodArguments(method, true);

			args.unshift(fullOptions);
		};
	};
}

const string = createArgument<StringArgumentOptions>(ArgumentType.String);
const integer = createArgument<IntegerArgumentOptions>(ArgumentType.Integer);
const number = createArgument<NumberArgumentOptions>(ArgumentType.Number);
const user = createArgument<UserArgumentOptions>(ArgumentType.User);
const member = createArgument<MemberArgumentOptions>(ArgumentType.Member);

function describeArgumentExpectation(arg: ArgumentOptions): string {
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
	}

	return parts.join(", ");
}

function format(arg: ArgumentOptions) {
	const { name, required, tuple } = arg;

	const opening = required ? "<" : "[";
	const closing = required ? ">" : "]";
	const prefix = tuple ? "..." : "";

	return `${opening}${prefix}${name}: ${describeArgumentExpectation(arg)}${closing}`;
}

export const Arg = {
	getMethodArguments,
	createArgument,
	describeArgumentExpectation,
	format,
	string,
	number,
	integer,
	user,
	member,
};
