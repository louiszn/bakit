import { Intent, useApp, useListeners } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const listeners = useListeners({
	pattern: "listeners/**/*.ts",
	cwd: import.meta.dirname,
});

const app = useApp({
	intents: [Intent.MessageContent, Intent.GuildMessages],
	token: BOT_TOKEN,
	plugins: [listeners],
});

await app.start();
