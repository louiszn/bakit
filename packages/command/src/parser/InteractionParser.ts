import { Command, CommandTree, type ExecutableCommand, type RootCommand } from "#/command";
import type { CommandContext } from "#/context";
import { MissingParameterError } from "#/errors";
import type { Parameter } from "#/parameter";

export interface InteractionParserOptions {
	root: RootCommand;
	context: CommandContext;
}

export interface InteractionParserResult {
	root: RootCommand;
	executable: ExecutableCommand;
	values: Record<string, unknown>;
}

export class InteractionParser {
	async parse(options: InteractionParserOptions): Promise<InteractionParserResult> {
		const { root, context } = options;

		if (!context.isChatInput()) {
			throw new TypeError("Expected a chat input context.");
		}

		let executable: ExecutableCommand | undefined;

		if (root instanceof CommandTree) {
			const { subcommandGroup: group, subcommand } = context.source.options;

			if (group && subcommand) {
				executable = root.groups.get(group)?.commands.get(subcommand);
			} else if (subcommand) {
				executable = root.commands.get(subcommand);
			}
		} else if (root instanceof Command) {
			executable = root;
		}

		if (!executable) {
			throw new Error("Failed to resolve executable command.");
		}

		const values: Record<string, unknown> = {};

		for (const parameter of Object.values<Parameter>(executable.parameters)) {
			const raw = context.source.options.get(parameter.name)?.value;

			if (raw === undefined) {
				if (parameter.required) {
					throw new MissingParameterError(parameter, {
						context,
						root,
						executable,
					});
				}

				continue;
			}

			const value = await parameter.parse(raw, {
				root: root,
				executable,
				context,
			});

			await parameter.validate?.(value, {
				root: root,
				executable,
				context,
			});

			values[parameter.name] = value;
		}

		Object.defineProperty(context, "values", {
			value: Object.freeze(values),
			enumerable: true,
		});

		return {
			root,
			executable,
			values,
		};
	}
}
