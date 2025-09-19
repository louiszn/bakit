import { ChatInputCommandInteraction, Message } from "discord.js";
import {
	Arg,
	ArgumentOptions,
	ArgumentType,
	CommandEntry,
	IntegerArgumentOptions,
	LiteralArgumentOptions,
	MemberArgumentOptions,
	NumberArgumentOptions,
	StringArgumentOptions,
	UserArgumentOptions,
} from "../index.js";
import { BakitClient } from "../../BakitClient.js";
import { HookExecutionState } from "../../base/BaseEntry.js";
import { extractId } from "../../utils/user.js";
import { CommandSyntaxError, CommandSyntaxErrorType } from "../../errors/CommandSyntaxError.js";

export interface ArgumentResolverOptions {
	message: Message;
	values: string[];
	prefix: string;
}

export class ArgumentResolver {
	private _parsedValues: unknown[] = [];
	private _args: (ArgumentOptions | LiteralArgumentOptions)[] = [];

	public constructor(
		private _values: string[],
		public prefix: string,
		public message: Message,
	) {}

	public get commandName(): string {
		return this._values[0];
	}

	public get values(): readonly string[] {
		return this._values;
	}

	public get parsedValues(): readonly unknown[] {
		return this._parsedValues;
	}

	public get args(): readonly (ArgumentOptions | LiteralArgumentOptions)[] {
		return this._args;
	}

	public get client(): BakitClient<true> {
		return this.message.client as BakitClient<true>;
	}

	public static async initialize(message: Message) {
		const client = message.client as BakitClient;

		const prefixes = await client.dispatchers.command.getPrefixes(message);
		const prefix = prefixes.find((p) => message.content.startsWith(p));

		if (!prefix) {
			return;
		}

		const values = message.content.slice(prefix.length).trim().split(/\s+/);

		return new ArgumentResolver(values, prefix, message);
	}

	public async resolve(entry: CommandEntry, at = 1) {
		const mainHook = entry.hooks[HookExecutionState.Main];
		const args = mainHook ? [...Arg.getMethodArguments(mainHook.method)] : [];

		let nextAt = at;

		if (args.length) {
			const values = this.values.slice(at);

			const parsedValues =
				args.length >= values.length
					? await this.parseExact(args, values)
					: await this.parseFlexible(args, values);

			nextAt += parsedValues.length;
			this._args.push(...args);
			this._parsedValues.push(...parsedValues);
		}

		const nextValue = this._values[nextAt];

		if (!nextValue || !("children" in entry)) {
			return;
		}

		const childEntry = entry.children.get(nextValue);

		if (!childEntry) {
			return;
		}

		this._args.push({
			type: ArgumentType.Literal,
			value: nextValue,
		});

		await this.resolve(childEntry, nextAt + 1);
	}

	protected async parseExact(args: ArgumentOptions[], values: string[]): Promise<unknown[]> {
		const parsedValues: unknown[] = [];

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			const value = values[i];

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue === null) {
				throw new CommandSyntaxError({
					arg,
					type: CommandSyntaxErrorType.InvalidArgument,
					received: value,
				});
			}

			parsedValues.push(matchedValue);
		}

		return parsedValues;
	}

	protected async parseFlexible(args: ArgumentOptions[], values: string[]): Promise<unknown[]> {
		let argIndex = 0;
		let valueIndex = 0;

		const parsedValues: unknown[] = [];

		while (argIndex < args.length) {
			const arg = args[argIndex];
			const value = values[valueIndex];

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue !== null) {
				parsedValues.push(matchedValue);
				valueIndex++;
			} else if (arg.required) {
				throw new CommandSyntaxError({
					type: CommandSyntaxErrorType.MissingRequireArgument,
					received: value,
					arg,
				});
			}

			argIndex++;
		}

		return parsedValues;
	}

	private async matchValue(arg: ArgumentOptions, value: string): Promise<unknown> {
		switch (arg.type) {
			case ArgumentType.User:
				return await this.matchUserValue(arg, value);
			case ArgumentType.Member:
				return await this.matchMemberValue(arg, value);
			case ArgumentType.Integer:
				return this.matchIntegerValue(arg, value);
			case ArgumentType.Number:
				return this.matchNumberValue(arg, value);
			case ArgumentType.String:
				return this.matchStringValue(arg, value);
			default:
				return null;
		}
	}

	private async matchUserValue(arg: UserArgumentOptions, value: string) {
		const userId = extractId(value);

		if (!userId) {
			return null;
		}

		return await this.client.users.fetch(userId).catch(() => null);
	}

	private async matchMemberValue(arg: MemberArgumentOptions, value: string) {
		const userId = extractId(value);

		if (!userId) {
			return;
		}

		const { guild } = this.message;

		if (!guild) {
			return;
		}

		return await guild.members.fetch(userId).catch(() => null);
	}

	private matchIntegerValue(arg: IntegerArgumentOptions, value: string) {
		const intVal = parseInt(value, 10);

		if (isNaN(intVal)) {
			return null;
		}

		if (arg.minValue !== undefined && intVal < arg.minValue) {
			return null;
		}

		if (arg.maxValue !== undefined && intVal > arg.maxValue) {
			return null;
		}

		return intVal;
	}

	private matchNumberValue(arg: NumberArgumentOptions, value: string) {
		const numVal = parseFloat(value);

		if (isNaN(numVal)) {
			return null;
		}

		if (arg.minValue !== undefined && numVal < arg.minValue) {
			return null;
		}

		if (arg.maxValue !== undefined && numVal > arg.maxValue) {
			return null;
		}

		return numVal;
	}

	private matchStringValue(arg: StringArgumentOptions, value: string) {
		if (arg.minLength !== undefined && value.length < arg.minLength) {
			return null;
		}

		if (arg.maxLength !== undefined && value.length > arg.maxLength) {
			return null;
		}

		return value;
	}

	public static resolveChatInputOption(
		interaction: ChatInputCommandInteraction,
		arg: ArgumentOptions,
	) {
		switch (arg.type) {
			case ArgumentType.String:
				return interaction.options.getString(arg.name, arg.required);
			case ArgumentType.Integer:
				return interaction.options.getInteger(arg.name, arg.required);
			case ArgumentType.Number:
				return interaction.options.getNumber(arg.name, arg.required);
			case ArgumentType.User:
				return interaction.options.getUser(arg.name, arg.required);
			case ArgumentType.Member:
				return interaction.options.getMember(arg.name);
			default:
				return null;
		}
	}
}
