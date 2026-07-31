import { BaseParameter, type ParameterOptions } from "./Parameter";

export class BooleanParameter<Required extends boolean = boolean> extends BaseParameter<
	boolean,
	ParameterOptions<Required>
> {
	parse(value: string) {
		return Boolean(value);
	}
}
