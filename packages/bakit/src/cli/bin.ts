#!/usr/bin/env node
// Main cli for bakit, use bakit -h for the list of commands
// JS version locates at dist/cli.js by tsup
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

import { config as useEnv } from "dotenv";

import { program } from "commander";
import { DevProcessManager } from "./process/DevProcessManager.js";
import { loadConfig } from "bakit";

program.name("bakit");

program.command("dev").action(async () => {
	useEnv({ path: [".env.local", ".env"], quiet: true });

	const config = await loadConfig();

	const entryDirectory = resolve(config.entryDirectory);

	const dev = new DevProcessManager({
		entryFile: getEntryFile(entryDirectory),
		entryDirectory,
	});

	dev.start();
});

function getEntryFile(entryDirectory: string) {
	const index = join(entryDirectory, "index");

	if (existsSync(index + ".ts")) {
		return index;
	}

	return index + ".js";
}

program.parse();
