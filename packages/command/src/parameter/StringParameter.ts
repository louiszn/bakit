import { BaseParameter, type ParameterOptions } from "./Parameter";

export type StringParameterOptions<Required extends boolean = boolean> =
	ParameterOptions<Required> & {
		minLength?: number;
		maxLength?: number;
		pattern?: RegExp;
	};

export class StringParameter<Required extends boolean = false> extends BaseParameter<
	string,
	StringParameterOptions<Required>
> {
	parse(value: string) {
		return value;
	}

	override validate(value: string) {
		const { minLength, maxLength, pattern } = this.options;

		if (minLength !== undefined && value.length < minLength) {
			throw new Error(`Expected at least ${minLength} characters.`);
		}

		if (maxLength !== undefined && value.length > maxLength) {
			throw new Error(`Expected at most ${maxLength} characters.`);
		}

		if (pattern && !pattern.test(value)) {
			throw new Error("Value does not match the required pattern.");
		}
	}
}
