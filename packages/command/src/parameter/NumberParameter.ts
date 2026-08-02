import { Parameter, type ParameterOptions } from "./Parameter";

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

	parse(value: string | number) {
		const number = Number(value);

		if (Number.isNaN(number)) {
			throw new Error("Expected a valid number.");
		}

		return number;
	}

	override validate(value: number) {
		const { min, max } = this;

		if (min !== undefined && value < min) {
			throw new Error(`Expected a value greater than or equal to ${min}.`);
		}

		if (max !== undefined && value > max) {
			throw new Error(`Expected a value less than or equal to ${max}.`);
		}
	}
}
