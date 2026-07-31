import shellQuote from "shell-quote";
import parse, { type Arguments } from "yargs-parser";

import type { Command, ParameterMap } from "#/command";
import type { CommandContext } from "#/context";
import type { BaseParameter } from "#/parameter";

type AnyCommand = Command<ParameterMap>;

export interface MessageParserOptions {
	content: string;
	prefixes: readonly string[];
	commands: ReadonlyMap<string, AnyCommand>;
	context: CommandContext;
}

export interface MessageParserResult {
	command: AnyCommand;
	values: Record<string, unknown>;
}

export interface ParsedCli {
	command: AnyCommand;
	argv: Arguments;
}

export class MessageParser {
	async parse(options: MessageParserOptions): Promise<MessageParserResult | null> {
		const parsed = this.parseCli(options);

		if (!parsed) {
			return null;
		}

		const values = await this.resolveParameters({
			command: parsed.command,
			argv: parsed.argv,
			context: options.context,
		});

		Object.defineProperty(options.context, "values", {
			value: values,
			enumerable: true,
		});

		return {
			command: parsed.command,
			values,
		};
	}

	tokenize(content: string): string[] {
		return shellQuote.parse(content).filter((token): token is string => typeof token === "string");
	}

	parseCli(options: MessageParserOptions): ParsedCli | null {
		const prefix = [...options.prefixes]
			.sort((a, b) => b.length - a.length)
			.find((prefix) => options.content.startsWith(prefix));

		if (!prefix) {
			return null;
		}

		const argv = this.tokenize(options.content.slice(prefix.length).trim());
		const commandName = argv.shift()?.toLowerCase();

		if (!commandName) {
			return null;
		}

		const command = options.commands.get(commandName);

		if (!command) {
			return null;
		}

		return {
			command,
			argv: parse(argv),
		};
	}

	async resolveParameters(options: {
		command: AnyCommand;
		argv: Arguments;
		context: CommandContext;
	}): Promise<Record<string, unknown>> {
		const { command, argv, context } = options;

		const values: Record<string, unknown> = {};
		const positional = [...argv._].map(String);

		const parameters: BaseParameter<unknown>[] = Object.values(command.parameters);
		const optionalParameters = parameters.filter((parameter) => !parameter.required);

		const allowOptionalPositional = optionalParameters.length === 1;

		for (const parameter of parameters) {
			let raw = argv[parameter.name];

			// Aliases
			if (raw === undefined) {
				for (const alias of parameter.aliases) {
					raw = argv[alias];

					if (raw !== undefined) {
						break;
					}
				}
			}

			// Required positional
			if (raw === undefined && parameter.required) {
				raw = positional.shift();
			}

			// Single optional positional
			if (raw === undefined && !parameter.required && allowOptionalPositional) {
				raw = positional.shift();
			}

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

			values[parameter.name] = value;
		}

		if (positional.length > 0) {
			throw new Error(`Unexpected positional argument '${positional[0]}'.`);
		}

		return values;
	}
}
