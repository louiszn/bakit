import { codeBlock } from "discord.js";
import { GetSyntaxErrorMessageFunction } from "../BakitClient.js";
import { ConstructorLike } from "../base/BaseEntry.js";
import { Arg, Command } from "../command/index.js";

export const defaultGetSyntaxErrorMessage: GetSyntaxErrorMessageFunction = (
	command,
	error,
	context,
	args,
	prefix,
) => {
	const requiredSyntax = args.map((x) => Arg.format(x)).join(" ");

	const root = Command.getRoot(command.constructor as ConstructorLike);

	if (!root) {
		return;
	}

	const content = [
		codeBlock(error.message),
		"Required Syntax:",
		codeBlock(`${prefix}${root.options.name} ${requiredSyntax}`),
	].join("\n");

	return {
		content,
	};
};
