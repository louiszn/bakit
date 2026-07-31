import { Intent, useApp, useListeners } from "bakit";

import { useCommands } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const listeners = useListeners({
	pattern: "listeners/**/*.ts",
	cwd: import.meta.dirname,
});

const commands = useCommands({
	pattern: "commands/**/*.ts",
	cwd: import.meta.dirname,
	prefixes: ["!", "owo", "?"],
});

const app = useApp({
	intents: [Intent.MessageContent, Intent.GuildMessages],
	token: BOT_TOKEN,
	plugins: [listeners, commands],
});

await app.start();
