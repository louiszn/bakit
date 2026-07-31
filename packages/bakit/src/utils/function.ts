import type { Constructor } from "type-fest";

// biome-ignore lint/suspicious/noExplicitAny: Accept various types
export function makeFactory<T extends Constructor<any, any>>(Class: T) {
	return (...args: ConstructorParameters<T>): InstanceType<T> => {
		return new Class(...args);
	};
}
