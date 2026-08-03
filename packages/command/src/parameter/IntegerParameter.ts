import { ParameterParseError } from "#/errors";

import { NumberParameter } from "./NumberParameter";
import type { ParameterParseContext } from "./Parameter";

export class IntegerParameter<
	Required extends boolean = boolean,
> extends NumberParameter<Required> {
	override parse(value: string | number, context: ParameterParseContext) {
		const number = super.parse(value, context);

		if (!Number.isInteger(number)) {
			throw new ParameterParseError(this, "Expected a valid integer.", context);
		}

		return number;
	}
}
