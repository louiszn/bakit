import { NumberParameter } from "./NumberParameter";

export class IntegerParameter<
	Required extends boolean = boolean,
> extends NumberParameter<Required> {
	override parse(value: string | number) {
		const number = super.parse(value);

		if (!Number.isInteger(number)) {
			throw new Error("Expected a valid integer.");
		}

		return number;
	}
}
