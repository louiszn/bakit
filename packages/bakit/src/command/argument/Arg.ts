import { NumberArgumentBuilder, StringArgumentBuilder } from "./ArgumentBuilder.js";
import type { ConstructorLike } from "../../types/index.js";

function makeFactory<Constructor extends ConstructorLike>(Factory: Constructor) {
	type Options = ConstructorParameters<Constructor>[0];
	type Instance = InstanceType<Constructor>;

	function createBuilder(name: string): Instance;
	function createBuilder(options: Options): Instance;
	function createBuilder(optionsOrName: string | Options): Instance {
		const options = typeof optionsOrName === "string" ? { name: optionsOrName } : optionsOrName;
		return new Factory(options) as Instance;
	}

	return createBuilder;
}

export const Arg = {
	string: makeFactory(StringArgumentBuilder),
	number: makeFactory(NumberArgumentBuilder),
};
