#!/usr/bin/env node
// Main cli for bakit, use bakit -h for the list of commands
// JS version locates at dist/cli.js by tsup
import { config as useEnv } from "dotenv";
import { program } from "commander";
import { DevProcessManager } from "./process/DevProcessManager.js";

program.name("bakit");

program.command("dev").action(() => {
	useEnv({ path: [".env.local", ".env"], quiet: true });

	const dev = new DevProcessManager({
		rootDir: "src",
		entry: "src/index.ts",
		hotDirs: ["commands", "listeners"],
	});

	dev.start();
});

program.parse();
