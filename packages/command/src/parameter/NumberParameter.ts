import { BaseParameter, type BaseParameterOptions } from "./Parameter";

export interface NumberParameterOptions extends BaseParameterOptions {
	min?: number;
	max?: number;
}

export class NumberParameter extends BaseParameter<number, NumberParameterOptions> {
	parse(value: string | number) {
		const number = Number(value);

		if (Number.isNaN(number)) {
			throw new Error("Expected a valid number.");
		}

		return number;
	}

	override validate(value: number) {
		const { min, max } = this.options;

		if (min !== undefined && value < min) {
			throw new Error(`Expected a value greater than or equal to ${min}.`);
		}

		if (max !== undefined && value > max) {
			throw new Error(`Expected a value less than or equal to ${max}.`);
		}
	}
}
