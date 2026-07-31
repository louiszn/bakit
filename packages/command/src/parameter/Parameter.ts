import type { Command } from "#/command";
import type { CommandContext } from "#/context";

export interface BaseParameterOptions {
	name?: string;
	description?: string;
	required?: boolean;
	aliases?: readonly string[];
}

export interface ParameterParseContext {
	command: Command;
	context: CommandContext;
}

export abstract class BaseParameter<
	Value,
	Options extends BaseParameterOptions = BaseParameterOptions,
> {
	readonly options: Options;

	constructor(options?: Options) {
		this.options = options ?? ({} as Options);
	}

	get name() {
		return this.options.name ?? "";
	}

	get required() {
		return this.options.required ?? false;
	}

	get aliases() {
		return this.options.aliases ?? [];
	}

	get description() {
		return this.options.description ?? this.name;
	}

	abstract parse(
		value: string | number | boolean,
		context: ParameterParseContext,
	): Value | Promise<Value>;

	validate(_value: Value): void | Promise<void> {}
}
