import { BaseParameter } from "./Parameter";

export class BooleanParameter extends BaseParameter<boolean> {
	parse(value: string) {
		return Boolean(value);
	}
}
