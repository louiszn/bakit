import type { Command } from "#/command";
import type { CommandContext } from "#/context";
import type { Parameter } from "#/parameter";

export interface InteractionParserOptions {
	command: Command;
	context: CommandContext;
}

export class InteractionParser {
	async parse({ command, context }: InteractionParserOptions) {
		if (!context.isChatInput()) {
			return {};
		}

		const values: Record<string, unknown> = {};

		for (const parameter of Object.values<Parameter>(command.parameters)) {
			const raw = context.source.options.get(parameter.name)?.value;

			if (raw === undefined) {
				if (parameter.required) {
					throw new Error(`Missing required parameter '${parameter.name}'.`);
				}

				continue;
			}

			const value = await parameter.parse(raw, {
				command,
				context,
			});

			await parameter.validate?.(value, {
				command,
				context,
			});

			values[parameter.name] = value;
		}

		Object.defineProperty(context, "values", {
			value: Object.freeze(values),
			enumerable: true,
		});

		return values;
	}
}
