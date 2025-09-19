import "dotenv/config";

import { BakitClient, CommandRegistry } from "../../src/index.js";
import { GatewayIntentBits } from "discord.js";

const client = new BakitClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	prefixes: ["!"],
	enableMentionPrefix: true,
});

await Promise.all([
	CommandRegistry.load("tests/runtime/commands/**/*.ts"),
	// ListenerRegistry.load("tests/runtime/listeners/**/*.ts"),
]);

await client.login(process.env.BOT_TOKEN);
