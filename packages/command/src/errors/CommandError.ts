import type { ExecutableCommand, RootCommand } from "#/command";
import type { CommandContext } from "#/context";

export interface CommandErrorOptions extends ErrorOptions {
	context?: CommandContext;
	root?: RootCommand;
	executable?: ExecutableCommand;
}

export class CommandError extends Error {
	readonly context?: CommandContext;
	readonly root?: RootCommand;
	readonly executable?: ExecutableCommand;

	constructor(message: string, options?: CommandErrorOptions) {
		super(message, options);

		this.name = new.target.name;

		this.context = options?.context;
		this.root = options?.root;
		this.executable = options?.executable;
	}
}
