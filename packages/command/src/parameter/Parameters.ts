import { BooleanParameter } from "./BooleanParameter";
import { IntegerParameter } from "./IntegerParameter";
import { NumberParameter, type NumberParameterOptions } from "./NumberParameter";
import type { ParameterOptions } from "./Parameter";
import { StringParameter, type StringParameterOptions } from "./StringParameter";

export const Parameters = {
	string: <const O extends StringParameterOptions>(options?: O) => {
		type Required = O extends { required: true } ? true : false;

		return new StringParameter<Required>(options as never);
	},

	number: <const O extends NumberParameterOptions>(options?: O) => {
		type Required = O extends { required: true } ? true : false;

		return new NumberParameter<Required>(options as NumberParameterOptions<Required>);
	},

	integer: <const O extends NumberParameterOptions>(options?: O) => {
		type Required = O extends { required: true } ? true : false;

		return new IntegerParameter<Required>(options as NumberParameterOptions<Required>);
	},

	boolean: <const O extends ParameterOptions>(options?: O) => {
		type Required = O extends { required: true } ? true : false;

		return new BooleanParameter<Required>(options as ParameterOptions<Required>);
	},
};
