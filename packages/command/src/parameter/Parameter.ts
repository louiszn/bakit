import type { Command } from "#/command";
import type { CommandContext } from "#/context";

export interface BaseParameterOptions {
	name?: string;
	description?: string;
	aliases?: readonly string[];
	required?: boolean;
}

export type RequiredOption<Required extends boolean> = Required extends true
	? { required: true }
	: { required?: false };

export type ParameterOptions<Required extends boolean = boolean> = Omit<
	BaseParameterOptions,
	"required"
> &
	RequiredOption<Required>;

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

	validate?(value: Value, context: ParameterParseContext): void | Promise<void>;
}
