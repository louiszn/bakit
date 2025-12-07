// @ts-check
import { config as useEnv } from "dotenv";
import { program } from "commander";

program.name("bakit");

program.command("dev").action(async () => {
	useEnv({
		path: [".env.local", ".env"],
		quiet: true,
	});
	const { default: nodemon } = await import("nodemon");

	nodemon({
		script: "src/index.ts",
		exec: `${process.execPath} --import tsx`,
		ext: "ts,js",
		watch: ["src"],
		env: {
			...process.env,
			FORCE_COLOR: "1",
			NODE_ENV: "development",
		},
	});

	nodemon.on("start", () => {
		console.log("Starting bakit app...");
	});

	nodemon.on("restart", () => {
		console.log("Bakit detected changes! Restarting...");
	});

	nodemon.on("quit", () => {
		process.exit();
	});
});

program.parse();
