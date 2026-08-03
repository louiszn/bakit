import { ParameterParseError, ParameterValidationError } from "#/errors";

import { Parameter, type ParameterOptions, type ParameterParseContext } from "./Parameter";

export type NumberParameterOptions<Required extends boolean = false> =
	ParameterOptions<Required> & {
		min?: number;
		max?: number;
	};

export class NumberParameter<Required extends boolean = false> extends Parameter<number, Required> {
	readonly min?: number;
	readonly max?: number;

	constructor(options?: NumberParameterOptions<Required>) {
		super(options);

		this.min = options?.min;
		this.max = options?.max;
	}

	parse(value: string | number, context: ParameterParseContext) {
		const number = Number(value);

		if (Number.isNaN(number)) {
			throw new ParameterParseError(this, "Expected a valid number.", context);
		}

		return number;
	}

	override validate(value: number, context: ParameterParseContext) {
		const { min, max } = this;

		if (min !== undefined && value < min) {
			throw new ParameterValidationError(
				this,
				`Expected a value greater than or equal to ${min}.`,
				context,
			);
		}

		if (max !== undefined && value > max) {
			throw new ParameterValidationError(
				this,
				`Expected a value less than or equal to ${max}.`,
				context,
			);
		}
	}
}
