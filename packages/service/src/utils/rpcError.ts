// rpcError.ts
import { instanceToObject } from "@bakit/utils";
import type { RPCResponseError } from "@/types/message.js";

const STANDARD_ERRORS = {
	Error,
	TypeError,
	RangeError,
	URIError,
	SyntaxError,
	ReferenceError,
	EvalError,
} as const;

export function serializeRPCError(err: Error): RPCResponseError {
	const base = instanceToObject(err) as Record<string, unknown>;

	const serialized: RPCResponseError = {
		...base,
		message: err.message,
		constructorName: err.constructor.name,
		name: err.constructor.name,
		stack: err.stack,
	};

	if (err.cause instanceof Error) {
		serialized.cause = serializeRPCError(err.cause);
	}

	if (err instanceof AggregateError && Array.isArray(err.errors)) {
		serialized.errors = err.errors.map((e) => serializeRPCError(e));
	}

	return serialized;
}

export function createDynamicRPCError(data: RPCResponseError): Error {
	const { constructorName, name, message, stack, cause, errors, ...customProps } = data;

	validateConstructorName(constructorName);

	const error = instantiateError(constructorName, message, errors);

	Object.assign(error, customProps);

	if (name) setProperty(error, "name", name);
	if (stack) setProperty(error, "stack", stack);
	if (cause && typeof cause === "object") {
		setProperty(error, "cause", createDynamicRPCError(cause));
	}

	return error;
}

function validateConstructorName(name: string): asserts name is string {
	if (!name || typeof name !== "string") {
		throw new TypeError("Invalid constructorName in serialized error");
	}
	if (name.length > 100 || /[<>\\{}]/.test(name)) {
		throw new TypeError(`Suspicious constructorName: ${name}`);
	}
	if (["__proto__", "constructor", "prototype"].includes(name)) {
		throw new Error(`Forbidden constructor name: ${name}`);
	}
}

function instantiateError(constructorName: string, message: string, errors?: unknown[]): Error {
	// AggregateError needs special handling due to different signature
	if (constructorName === "AggregateError") {
		const childErrors = Array.isArray(errors)
			? errors.map((e) => (isSerializedError(e) ? createDynamicRPCError(e) : new Error(String(e))))
			: [];
		return new AggregateError(childErrors, message);
	}

	// Standard native errors
	if (constructorName in STANDARD_ERRORS) {
		const Constructor = STANDARD_ERRORS[constructorName as keyof typeof STANDARD_ERRORS];
		return new Constructor(message);
	}

	// Custom errors - create dynamic class to preserve name in stack traces
	const CustomError = { [constructorName]: class extends Error {} }[constructorName]!;
	return new CustomError(message);
}

function setProperty<T extends Error, K extends keyof T>(error: T, key: K, value: T[K]): void {
	Object.defineProperty(error, key, { value, configurable: true, writable: true });
}

export function isSerializedError(value: unknown): value is RPCResponseError {
	return typeof value === "object" && value !== null && "constructorName" in value && "message" in value;
}
