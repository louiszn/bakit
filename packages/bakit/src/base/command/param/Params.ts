import { NumberParam, StringParam } from "./Param.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createFactory<Args extends any[], Instance>(ctor: ConstructorLike<Args, Instance>) {
	return (...args: Args): Instance => new ctor(...args);
}

export const Params = {
	string: createFactory(StringParam),
	number: createFactory(NumberParam),
} as const;
