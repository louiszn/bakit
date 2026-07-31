import { NumberParameter } from "./NumberParameter";

export class IntegerParameter extends NumberParameter {
	override parse(value: string | number) {
		const number = super.parse(value);

		if (!Number.isInteger(number)) {
			throw new Error("Expected a valid integer.");
		}

		return number;
	}
}
