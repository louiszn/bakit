import { ArgumentOptions } from "../command/argument/Argument.js";
import { Arg } from "../command/index.js";

export enum CommandSyntaxErrorType {
	MissingRequireArgument = "MISSING_REQUIRE_ARGUMENT",
	InvalidArgument = "INVALID_ARGUMENT",
	InvalidVariadicArgumentValue = "INVALID_VARIADIC_ARGUMENT_VALUE",
}

export interface CommandSyntaxErrorOptions {
	arg: ArgumentOptions;
	type: CommandSyntaxErrorType;
	received: unknown;
}

export class CommandSyntaxError extends Error {
	public readonly arg: ArgumentOptions;
	public readonly type: CommandSyntaxErrorType;
	public readonly expected: unknown;
	public readonly received: unknown;

	constructor(options: CommandSyntaxErrorOptions) {
		let message: string;

		const { arg, type, received } = options;

		const expected = Arg.describeArgumentExpectation(arg);

		switch (type) {
			case CommandSyntaxErrorType.MissingRequireArgument: {
				message = [`Missing required argument "${arg.name}"`, `> Expected: ${expected}`].join("\n");

				break;
			}

			case CommandSyntaxErrorType.InvalidArgument: {
				message = [
					`Invalid value received for argument "${arg.name}"`,
					`> Expected: ${expected}`,
					`> Received: ${String(received)}`,
				].join("\n");

				break;
			}

			case CommandSyntaxErrorType.InvalidVariadicArgumentValue: {
				message = [
					`Invalid value received for variadic argument "${arg.name}"`,
					`> Expected: ${expected}`,
					`> Received: ${String(received)}`,
				].join("\n");

				break;
			}

			default: {
				message = "Unknown error";
				break;
			}
		}

		super(message);

		this.arg = arg;
		this.type = type;
		this.expected = expected;
		this.received = received;

		Error.captureStackTrace(this, this.constructor);
	}

	public get name() {
		return `CommandSyntaxError[${this.type}]`;
	}
}
