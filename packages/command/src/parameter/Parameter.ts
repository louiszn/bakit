import type { ExecutableCommand, RootCommand } from "#/command";
import type { CommandContext } from "#/context";

export type ParameterOptions<Required extends boolean = boolean> = {
	name?: string;
	description?: string;
	aliases?: readonly string[];
	required?: Required;
};

export interface ParameterParseContext {
	root: RootCommand;
	executable: ExecutableCommand;
	context: CommandContext;
}

export abstract class Parameter<Value = unknown, Required extends boolean = boolean> {
	readonly name!: string;
	readonly description: string;
	readonly aliases: string[];
	readonly required: Required;

	constructor(options?: ParameterOptions<Required>) {
		this.name = options?.name ?? "";
		this.description = options?.description ?? "a command";
		this.aliases = (options?.aliases ?? []) as string[];
		this.required = Boolean(options?.required) as Required;
	}

	abstract parse(
		value: string | number | boolean,
		context: ParameterParseContext,
	): Value | Promise<Value>;

	validate?(value: Value, context: ParameterParseContext): void | Promise<void>;
}
