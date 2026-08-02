import { Parameter } from "./Parameter";

export class BooleanParameter<Required extends boolean = boolean> extends Parameter<
	boolean,
	Required
> {
	parse(value: string) {
		return Boolean(value);
	}
}
