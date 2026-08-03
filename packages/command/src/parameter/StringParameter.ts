import { ParameterValidationError } from "#/errors";

import { Parameter, type ParameterOptions, type ParameterParseContext } from "./Parameter";

export interface StringParameterOptions<Required extends boolean = boolean>
	extends ParameterOptions<Required> {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
}

export class StringParameter<Required extends boolean = false> extends Parameter<string, Required> {
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly pattern?: RegExp;

	constructor(options?: StringParameterOptions<Required>) {
		super(options);

		this.maxLength = options?.maxLength;
		this.minLength = options?.minLength;
		this.pattern = options?.pattern;
	}

	parse(value: string) {
		return value;
	}

	override validate(value: string, context: ParameterParseContext) {
		const { minLength, maxLength, pattern } = this;

		if (minLength !== undefined && value.length < minLength) {
			throw new ParameterValidationError(
				this,
				`Expected at least ${minLength} characters.`,
				context,
			);
		}

		if (maxLength !== undefined && value.length > maxLength) {
			throw new ParameterValidationError(
				this,
				`Expected at most ${maxLength} characters.`,
				context,
			);
		}

		if (pattern && !pattern.test(value)) {
			throw new ParameterValidationError(
				this,
				"Value does not match the required pattern.",
				context,
			);
		}
	}
}
