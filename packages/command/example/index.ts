import { Intent, useApp, useListeners } from "bakit";

import { useCommandErrors, useCommands } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const listeners = useListeners({
	pattern: "listeners/**/*.ts",
	cwd: import.meta.dirname,
});

const errors = useCommandErrors({
	onUnknownCommand(error) {
		console.warn(error);

		error.context?.send(`Unknown command \`${error.command}\`.`);
	},

	onUnknownSubcommand(error) {
		console.warn(error);

		error.context?.send(`Unknown subcommand \`${error.subcommand}\` for \`${error.parent.name}\`.`);
	},

	onMissingSubcommand(error) {
		console.warn(error);

		error.context?.send(`Missing subcommand for \`${error.parent.name}\`.`);
	},

	onUnknownOption(error) {
		console.warn(error);

		error.context?.send(`Unknown option \`--${error.option}\`.`);
	},

	onInvalidOptionSyntax(error) {
		console.warn(error);

		error.context?.send(`Invalid option syntax: \`${error.option}\`.`);
	},

	onUnexpectedArgument(error) {
		console.warn(error);

		error.context?.send(`Unexpected argument \`${error.argument}\`.`);
	},

	onMissingParameter(error) {
		console.warn(error);

		error.context?.send(`Missing required parameter \`${error.parameter.name}\`.`);
	},

	onParameterParse(error) {
		console.warn(error);

		error.context?.send(
			error.cause instanceof Error
				? error.cause.message
				: `Failed to parse parameter \`${error.parameter.name}\`.`,
		);
	},

	onParameterValidation(error) {
		console.warn(error);

		error.context?.send(
			error.cause instanceof Error
				? error.cause.message
				: `Parameter \`${error.parameter.name}\` is invalid.`,
		);
	},

	onExecutionError(error) {
		console.error(error);

		error.context?.send("An unexpected error occurred while executing this command.");
	},

	onSyntaxError(error) {
		console.error(error);
	},
});

const commands = useCommands({
	pattern: "commands/**/*.ts",
	cwd: import.meta.dirname,
	prefixes: ["!", "owo", "?"],
	plugins: [errors],
});

const app = useApp({
	intents: [Intent.MessageContent, Intent.GuildMessages],
	token: BOT_TOKEN,
	plugins: [listeners, commands],
});

await app.start();
