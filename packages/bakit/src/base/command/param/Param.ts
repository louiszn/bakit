import type { Awaitable, User } from "discord.js";
import type { ChatInputContext, CommandContext, MessageContext } from "../CommandContext.js";
import {
	NumberParamSchema,
	StringParamSchema,
	UserParamSchema,
	type BaseParamOptions,
	type NumberOptions,
	type StringOptions,
	type UserOptions,
} from "./ParamSchema.js";
import { ArgumentError } from "../../../errors/ArgumentError.js";
import type z from "zod";
import { extractSnowflakeId } from "../../../utils/string.js";

export type ParamResolvedOutputType<OutputType, Required extends boolean = true> = Required extends true
	? OutputType
	: OutputType | null;

export abstract class BaseParam<Options extends BaseParamOptions, OutputType, Required extends boolean = true> {
	public options: Options & { required: Required };

	/**
	 * **Internal Phantom Type**
	 *
	 * Used strictly for TypeScript type inference to determine the runtime value
	 * of this parameter. This property does not exist at runtime.
	 *
	 * @internal
	 */
	declare public readonly _type: Required extends true ? OutputType : OutputType | null;

	public constructor(
		options: Options,
		private schema: z.ZodObject,
	) {
		const parsed = schema.parse({
			...options,
			description: options.description ?? options.name,
		});

		this.options = parsed as Options & { required: Required };
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected setOption(key: keyof Options, value: any): this {
		if (value === null) {
			delete this.options[key];
			return this;
		}

		const fieldValidator = this.schema.shape[key as string];

		if (!fieldValidator) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.options as any)[key] = value;
			return this;
		}

		const parsedValue = fieldValidator.parse(value);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.options as any)[key] = parsedValue;

		return this;
	}

	public name(value: string) {
		return this.setOption("name", value);
	}

	public description(value: string) {
		return this.setOption("description", value);
	}

	public required<V extends boolean>(value: V): BaseParam<Options, OutputType, V> {
		return this.setOption("required", value) as never;
	}

	public async resolve(
		context: CommandContext,
		value?: string,
	): Promise<ParamResolvedOutputType<OutputType, Required>> {
		const { required, name } = this.options;

		if (value === undefined) {
			if (required) {
				throw new ArgumentError(name, "is required");
			}

			return null as never;
		}

		if (context.isChatInput()) {
			return await this.resolveChatInput(context);
		} else if (context.isMessage()) {
			return await this.resolveMessage(context, value);
		}

		throw new Error("Invalid context type provided");
	}

	public abstract resolveMessage(
		context: MessageContext,
		value: string,
	): Awaitable<ParamResolvedOutputType<OutputType, Required>>;
	public abstract resolveChatInput(context: ChatInputContext): Awaitable<ParamResolvedOutputType<OutputType, Required>>;

	/**
	 * Helper to normalize string inputs into an options object.
	 */
	protected static getOptions<Options>(options: Options | string): Options {
		return typeof options === "string" ? ({ name: options } as never) : options;
	}
}

export class StringParam<Required extends boolean = true> extends BaseParam<StringOptions, string, Required> {
	public constructor(options: string | StringOptions) {
		super(BaseParam.getOptions(options), StringParamSchema);
	}

	public override required<V extends boolean>(value: V): StringParam<V> {
		return super.required(value) as never;
	}

	public override resolveMessage(_context: CommandContext, value: string): ParamResolvedOutputType<string, Required> {
		const { minLength, maxLength, name } = this.options;

		if (minLength && value.length < minLength) {
			throw new ArgumentError(name, `must be at least ${minLength} chars long`);
		}
		if (maxLength && value.length > maxLength) {
			throw new ArgumentError(name, `must be at most ${maxLength} chars long`);
		}

		return value;
	}

	public override resolveChatInput(context: ChatInputContext): ParamResolvedOutputType<string, Required> {
		const { name, required } = this.options;
		return context.source.options.getString(name, required) as never;
	}

	/**
	 * Sets the minimum allowed length for this string.
	 * Pass `null` to remove this constraint.
	 */
	public min(length: number | null) {
		return this.setOption("minLength", length);
	}

	/**
	 * Sets the maximum allowed length for this string.
	 * Pass `null` to remove this constraint.
	 */
	public max(length: number | null) {
		return this.setOption("maxLength", length);
	}
}

export class NumberParam<Required extends boolean = true> extends BaseParam<NumberOptions, number, Required> {
	public constructor(options: string | NumberOptions) {
		super(BaseParam.getOptions(options), NumberParamSchema);
	}

	public override required<V extends boolean>(value: V): NumberParam<V> {
		return super.required(value) as never;
	}

	public override resolveMessage(_context: CommandContext, value: string): ParamResolvedOutputType<number, Required> {
		const { minValue, maxValue, name } = this.options;

		const num = Number(value);

		if (isNaN(num)) {
			throw new ArgumentError(name, "must be a number");
		}

		if (minValue !== undefined && num < minValue) {
			throw new ArgumentError(name, `must be greater than ${minValue}`);
		}
		if (maxValue !== undefined && num > maxValue) {
			throw new ArgumentError(name, `must be less than ${minValue}`);
		}

		return num;
	}

	public override resolveChatInput(context: ChatInputContext): ParamResolvedOutputType<number, Required> {
		const { name, required } = this.options;
		return context.source.options.getString(name, required) as never;
	}

	/**
	 * Sets the minimum allowed value for this number.
	 * Pass `null` to remove this constraint.
	 */
	public min(value: number | null) {
		return this.setOption("minValue", value);
	}

	/**
	 * Sets the maximum allowed value for this number.
	 * Pass `null` to remove this constraint.
	 */
	public max(value: number | null) {
		return this.setOption("maxValue", value);
	}
}

export class UserParam<Required extends boolean = true> extends BaseParam<UserOptions, User, Required> {
	public constructor(options: string | UserOptions) {
		super(BaseParam.getOptions(options), UserParamSchema);
	}

	public override required<V extends boolean>(value: V): UserParam<V> {
		return super.required(value) as never;
	}

	public override async resolveMessage(
		context: CommandContext,
		value: string,
	): Promise<ParamResolvedOutputType<User, Required>> {
		const id = extractSnowflakeId(value);

		if (!id) {
			return null as never;
		}

		const { users } = context.client;

		const user = await users.fetch(id).catch(() => null);

		return user as never;
	}

	public override resolveChatInput(context: ChatInputContext): ParamResolvedOutputType<User, Required> {
		const { name, required } = this.options;
		return context.source.options.getUser(name, required) as never;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyParam<Required extends boolean = true> = BaseParam<any, any, Required>;

/**
 * Helper type to extract the runtime value of a Param instance.
 *
 * @example
 * const p = new StringParam("name").required(false);
 * type T = InferParamValue<typeof p>; // string | null
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferParamValue<P extends AnyParam<any>> = P["_type"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferParamTuple<T extends readonly BaseParam<any, any, any>[]> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[K in keyof T]: T[K] extends AnyParam<any> ? InferParamValue<T[K]> : never;
};
