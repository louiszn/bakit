import { BakitError } from "./BakitError.js";

export class ArgumentError extends BakitError {
	public constructor(
		public target: string,
		public reason: string,
	) {
		super(`Invalid argument for '${target}': ${reason}`);
	}
}
