import { pathToFileURL } from "node:url";

import type { GlobOptions } from "bakit";
import { glob } from "bakit";

import { Command, CommandTree, type RootCommand } from "../command";

export interface LoadCommandsOptions extends GlobOptions {
	pattern: string | readonly string[];
}

export async function loadCommands(options: LoadCommandsOptions): Promise<RootCommand[]> {
	const files = await glob(options.pattern, {
		cwd: options.cwd,
	});

	const modules = await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

	return modules.flatMap((module) =>
		Object.values(module).filter(
			(value): value is RootCommand => value instanceof Command || value instanceof CommandTree,
		),
	);
}
