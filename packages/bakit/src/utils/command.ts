import { Awaitable, codeBlock, MessageCreateOptions } from "discord.js";
import { ConstructorLike } from "../base/BaseEntry.js";
import { Arg, Command, MessageContext } from "../command/index.js";
import { CommandSyntaxError } from "../errors/CommandSyntaxError.js";
import { ArgumentResolver } from "../command/argument/ArgumentResolver.js";

export type GetSyntaxErrorMessageFunction = (
	command: object,
	error: CommandSyntaxError,
	context: MessageContext,
	resolver: ArgumentResolver,
) => Awaitable<MessageCreateOptions | undefined>;

export const defaultGetSyntaxErrorMessage: GetSyntaxErrorMessageFunction = (
	command,
	error,
	context,
	resolver: ArgumentResolver,
) => {
	const requiredSyntax = resolver.args.map((x) => Arg.format(x)).join(" ");

	const root = Command.getRoot(command.constructor as ConstructorLike);

	if (!root) {
		return;
	}

	const content = [
		codeBlock(error.message),
		"Required Syntax:",
		codeBlock(`${resolver.prefix}${root.options.name} ${requiredSyntax}`),
	].join("\n");

	return {
		content,
	};
};
