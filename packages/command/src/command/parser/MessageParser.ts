import type { ReadonlyCollection } from "bakit";
import shellQuote from "shell-quote";
import parse, { type Arguments } from "yargs-parser";

import { Command, type ExecutableCommand, type RootCommand } from "#/command";
import type { CommandContext } from "#/context";
import {
	InvalidOptionSyntaxError,
	MissingParameterError,
	MissingSubcommandError,
	UnexpectedArgumentError,
	UnknownCommandError,
	UnknownSubcommandError,
} from "#/errors";
import type { Parameter } from "#/parameter";

export interface MessageParserOptions {
	content: string;
	prefixes: readonly string[];
	commands: ReadonlyCollection<string, RootCommand>;
	context: CommandContext;
}

export interface MessageParserResult {
	root: RootCommand;
	executable: ExecutableCommand;
	values: Record<string, unknown>;
}

export interface ParsedCli {
	root: RootCommand;
	argv: Arguments;
}

export class MessageParser {
	async parse(options: MessageParserOptions): Promise<MessageParserResult | null> {
		const parsed = this.parseCli(options);

		if (!parsed) {
			return null;
		}

		const executable = this.resolveExecutable(options.context, parsed);

		const values = await this.resolveParameters({
			root: parsed.root,
			executable: executable,
			argv: parsed.argv,
			context: options.context,
		});

		Object.defineProperty(options.context, "values", {
			value: values,
			enumerable: true,
		});

		return {
			root: parsed.root,
			executable,
			values,
		};
	}

	tokenize(context: CommandContext, content: string): string[] {
		const argv = shellQuote
			.parse(content)
			.filter((token): token is string => typeof token === "string");

		for (const arg of argv) {
			if (/^-[^-].{1,}/.test(arg)) {
				throw new InvalidOptionSyntaxError(arg, {
					context,
				});
			}
		}

		return argv;
	}

	parseCli(options: MessageParserOptions): ParsedCli | null {
		const prefix = [...options.prefixes]
			.sort((a, b) => b.length - a.length)
			.find((prefix) => options.content.startsWith(prefix));

		if (!prefix) {
			return null;
		}

		const argv = this.tokenize(options.context, options.content.slice(prefix.length).trim());
		const commandName = argv.shift()?.toLowerCase();

		if (!commandName) {
			return null;
		}

		const root = options.commands.get(commandName);

		if (!root) {
			throw new UnknownCommandError(commandName, {
				context: options.context,
			});
		}

		return {
			root,
			argv: parse(argv),
		};
	}

	resolveExecutable(context: CommandContext, parsed: ParsedCli): ExecutableCommand {
		const { root, argv } = parsed;

		if (root instanceof Command) {
			return root;
		}

		const positional = [...argv._].map(String);
		const first = positional.shift();

		if (!first) {
			throw new MissingSubcommandError(root, {
				context,
				root,
			});
		}

		const group = root.groups.get(first);

		if (group) {
			const second = positional.shift();

			if (!second) {
				throw new MissingSubcommandError(group, {
					context,
					root,
				});
			}

			const subcommand = group.commands.get(second);

			if (!subcommand) {
				throw new UnknownSubcommandError(group, second, {
					context,
					root,
				});
			}

			argv._ = positional;
			return subcommand;
		}

		const subcommand = root.commands.get(first);

		if (!subcommand) {
			throw new UnknownSubcommandError(root, first, {
				context,
				root,
			});
		}

		argv._ = positional;
		return subcommand;
	}

	async resolveParameters(options: {
		root: RootCommand;
		executable: ExecutableCommand;
		argv: Arguments;
		context: CommandContext;
	}): Promise<Record<string, unknown>> {
		const { executable, argv, context, root } = options;

		const values: Record<string, unknown> = {};
		const positional = [...argv._].map(String);

		const parameters: Parameter[] = Object.values(executable.parameters);
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
					throw new MissingParameterError(parameter, {
						context,
						root,
						executable,
					});
				}

				continue;
			}

			const value = await parameter.parse(raw, {
				root,
				executable,
				context,
			});

			await parameter.validate?.(value, {
				root,
				executable,
				context,
			});

			values[parameter.name] = value;
		}

		if (positional[0]) {
			throw new UnexpectedArgumentError(positional[0]);
		}

		return values;
	}
}
