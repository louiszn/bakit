import { BooleanParameter } from "./BooleanParameter";
import { IntegerParameter } from "./IntegerParameter";
import { NumberParameter, type NumberParameterOptions } from "./NumberParameter";
import type { ParameterOptions } from "./Parameter";
import { StringParameter, type StringParameterOptions } from "./StringParameter";
import { UserParameter, type UserParameterOptions } from "./UserParameter";

export const Parameters = {
	string<const R extends boolean>(options?: StringParameterOptions<R>) {
		return new StringParameter<R>(options);
	},

	number<const R extends boolean>(options?: NumberParameterOptions<R>) {
		return new NumberParameter<R>(options);
	},

	integer<const R extends boolean>(options?: NumberParameterOptions<R>) {
		return new IntegerParameter<R>(options);
	},

	boolean<const R extends boolean>(options?: ParameterOptions<R>) {
		return new BooleanParameter<R>(options);
	},

	user<const R extends boolean>(options?: UserParameterOptions<R>) {
		return new UserParameter<R>(options);
	},
};
