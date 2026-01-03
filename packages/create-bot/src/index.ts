#!/usr/bin/env node
import { program } from "commander";
import { intro, text } from "@clack/prompts";
import chalk from "chalk";

import { resolve } from "node:path";
import { readdirSync } from "node:fs";

import pkg from "../package.json" with { type: "json" };
program
	.name(pkg.name)
	.description("Helper for creating bakit project.")
	.version(pkg.version)
	.argument("[project name]")
	.action(handleAction);

await program.parseAsync(process.argv);

async function handleAction(name: string) {
	intro(`${chalk.bold.inverse(pkg.name)} ${chalk.dim(pkg.version)}`);

	if (!name) {
		name = (
			await text({
				message: "What is your project name?",
				initialValue: "my-bot",
			})
		).toString();
	}

	const projectPath = resolve(process.cwd(), name);

	if (!isEmpty(projectPath)) {
		return;
	}
}

function isEmpty(path: string) {
	return !!readdirSync(path).length;
}
