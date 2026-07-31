import { makeFactory } from "bakit";

import { IntegerParameter } from "./IntegerParameter";
import { NumberParameter } from "./NumberParameter";
import { StringParameter } from "./StringParameter";

export const Parameters = {
	string: makeFactory(StringParameter),
	number: makeFactory(NumberParameter),
	integer: makeFactory(IntegerParameter),
};
