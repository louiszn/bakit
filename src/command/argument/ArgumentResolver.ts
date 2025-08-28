import { ChatInputCommandInteraction, Message } from "discord.js";
import {
	ArgumentOptions,
	ArgumentType,
	IntegerArgumentOptions,
	NumberArgumentOptions,
	StringArgumentOptions,
	UserArgumentOptions,
} from "../index.js";
import { BakitClient } from "../../BakitClient.js";
import { extractId } from "../../utils/user.js";
import { CommandSyntaxError, CommandSyntaxErrorType } from "../../errors/CommandSyntaxError.js";

export interface ArgumentResolverOptions {
	message: Message;
	args: ArgumentOptions[];
	values: string[];
	prefix: string;
	startAt: number;
}

export class ArgumentResolver {
	public parsedValues: unknown[] = [];

	public constructor(public options: ArgumentResolverOptions) {}

	/**
	 * Get the first value as the command trigger.
	 */
	public get trigger() {
		return this.options.values[0];
	}

	/**
	 * Get amount of specified argument values.
	 */
	public get specifiedAmount() {
		return this.options.values.length - this.options.startAt;
	}

	/**
	 * Get parsed raw values from content.
	 */
	public get values(): readonly string[] {
		return [...this.options.values];
	}

	get client(): BakitClient<true> {
		return this.options.message.client as BakitClient<true>;
	}

	public static create(message: Message) {
		const client = message.client as BakitClient<true>;

		const { enableMentionPrefix } = client.options;

		const prefixes = [
			// Custom prefixes specified in options
			...(client.options.prefixes ?? []),
			// Use bot mention as prefix if enabled
			...(enableMentionPrefix ? [client.user.toString()] : []),
		];

		const prefix = prefixes.find((p) => message.content.startsWith(p)) ?? null;

		if (!prefix) {
			return;
		}

		const values = message.content.slice(prefix.length).trim().split(/\s+/);

		return new ArgumentResolver({
			message,
			startAt: 1, // Skip the command trigger
			values,
			args: [],
			prefix,
		});
	}

	public async resolve(args: ArgumentOptions[]) {
		const child = new ArgumentResolver({
			prefix: this.options.prefix,
			message: this.options.message,
			values: this.options.values,
			args,
			startAt: this.options.startAt,
		});

		child.parsedValues = [...this.parsedValues];

		if (!child.options.args.length) {
			return child;
		}

		if (this.specifiedAmount >= child.options.args.length) {
			await child.absoluteParse();
		} else {
			await child.dynamicParse();
		}

		return child;
	}

	private async absoluteParse() {
		const { args, values, startAt } = this.options;

		let valueIndex = startAt;
		let argIndex = 0;

		while (valueIndex < values.length && argIndex < args.length) {
			const value = values[valueIndex];
			const arg = args[argIndex];

			if (arg.tuple) {
				this.parsedValues.push(...(await this.resolveTuple(arg, valueIndex, argIndex)));
				break; // Tuple must be the last one, so it's safe to break here
			}

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue === null) {
				throw new CommandSyntaxError({
					arg,
					type: CommandSyntaxErrorType.InvalidArgument,
					received: value,
				});
			}

			this.parsedValues.push(matchedValue);

			valueIndex++;
			argIndex++;
		}
	}

	private async dynamicParse() {
		const { args, values } = this.options;

		let argIndex = 0;
		let valueIndex = this.options.startAt + 1;

		while (valueIndex < values.length && argIndex < args.length) {
			const value = values[valueIndex];
			const arg = args[argIndex];

			if (arg.tuple) {
				this.parsedValues.push(...(await this.resolveTuple(arg, valueIndex, argIndex)));
				break; // Tuple must be the last one, so it's safe to break here
			}

			const matchedValue = await this.matchValue(arg, value);

			if (matchedValue !== null) {
				this.parsedValues.push(matchedValue);
				valueIndex++;
			} else if (arg.required) {
				throw new CommandSyntaxError({
					arg,
					type: CommandSyntaxErrorType.MissingRequireArgument,
					received: value,
				});
			}

			argIndex++;
		}

		while (argIndex < args.length) {
			const arg = args[argIndex];

			if (arg.required) {
				throw new CommandSyntaxError({
					arg,
					type: CommandSyntaxErrorType.MissingRequireArgument,
					received: "nothing",
				});
			}

			argIndex++;
		}
	}

	private async resolveTuple(
		arg: ArgumentOptions,
		startIndex: number,
		argIndex: number,
	): Promise<unknown[]> {
		const { args } = this.options;

		if (argIndex !== args.length - 1) {
			throw new SyntaxError("Tuple argument must be the last argument");
		}

		const values: unknown[] = [];

		for (const rest of this.values.slice(startIndex)) {
			const matchedValue = await this.matchValue(arg, rest);

			if (matchedValue === null) {
				throw new CommandSyntaxError({
					arg,
					type: CommandSyntaxErrorType.InvalidVariadicArgumentValue,
					received: rest,
				});
			}

			values.push(matchedValue);
		}

		if (values.length === 0 && arg.required) {
			throw new CommandSyntaxError({
				arg,
				type: CommandSyntaxErrorType.MissingRequireArgument,
				received: "nothing",
			});
		}

		return values;
	}

	private async matchValue(arg: ArgumentOptions, value: string): Promise<unknown> {
		switch (arg.type) {
			case ArgumentType.User:
				return await this.matchUserValue(arg, value);
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

		const user = await this.client.users.fetch(userId).catch(() => null);

		if (!user) {
			return null;
		}

		return user;
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

	public static resolveChatInput(interaction: ChatInputCommandInteraction, arg: ArgumentOptions) {
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
