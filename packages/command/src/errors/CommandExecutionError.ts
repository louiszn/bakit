import type { ExecutableCommand, RootCommand } from "#/command";
import type { CommandContext } from "#/context";

import { CommandError } from "./CommandError";

export class CommandExecutionError extends CommandError {
	constructor(
		root: RootCommand,
		executable: ExecutableCommand,
		context: CommandContext,
		cause: unknown,
	) {
		super(`Command '${executable.name}' failed to execute.`, {
			root,
			executable,
			context,
			cause,
		});
	}
}
