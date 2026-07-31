import type { Command, ParameterMap } from "#/command";
import type { CommandContext } from "#/context";
import type { BaseParameter } from "#/parameter";

export interface InteractionParserOptions {
	command: Command<ParameterMap>;
	context: CommandContext;
}

export class InteractionParser {
	async parse({ command, context }: InteractionParserOptions) {
		if (!context.isChatInput()) {
			return {};
		}

		const values: Record<string, unknown> = {};

		for (const parameter of Object.values<BaseParameter<unknown>>(command.parameters)) {
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
