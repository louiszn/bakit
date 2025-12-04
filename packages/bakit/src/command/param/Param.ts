import type { BaseParamOptions, NumberOptions, StringOptions } from "./ParamSchema.js";

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

	public constructor(options: Options) {
		// We cast to `never` to suppress strict type checks on this initial assignment
		// because we are manually forcing the generic constraint.
		this.options = { ...options, required: options.required ?? true } as never;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected setOption(key: keyof Options, value: any): this {
		if (value === null) {
			delete this.options[key];
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this.options as any)[key] = value;
		}

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

	/**
	 * Helper to normalize string inputs into an options object.
	 */
	protected static getOptions<Options>(options: Options | string): Options {
		return typeof options === "string" ? ({ name: options } as never) : options;
	}
}

export class StringParam<Required extends boolean = true> extends BaseParam<StringOptions, string, Required> {
	public constructor(options: string | StringOptions) {
		super(BaseParam.getOptions(options));
	}

	public override required<V extends boolean>(value: V): StringParam<V> {
		return super.required(value) as never;
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
		super(BaseParam.getOptions(options));
	}

	public override required<V extends boolean>(value: V): NumberParam<V> {
		return super.required(value) as never;
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
