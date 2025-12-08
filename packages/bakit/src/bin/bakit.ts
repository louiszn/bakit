import { config as useEnv } from "dotenv";
import { program } from "commander";
import { DevProcessManager } from "../base/process/DevProcessManager.js";

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
