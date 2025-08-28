import "dotenv/config";

import { BakitClient, CommandRegistry } from "bakit";

import { Events, GatewayIntentBits } from "discord.js";

const client = new BakitClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	prefixes: ["!"],
	enableMentionPrefix: true,
});

const loaded = await CommandRegistry.loadDirectory("example/commands/**/*.ts");

console.log(`Loaded ${String(loaded.length)} commands`);

client.on(Events.ClientReady, () => {
	console.log("Bot is ready");
});

await client.login(process.env.BOT_TOKEN);
