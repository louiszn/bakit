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

await CommandRegistry.loadDirectory("example/commands/**/*.ts");

console.log(CommandRegistry.constructors);

client.on(Events.ClientReady, () => {
	console.log("Bot is ready");
});

await client.login(process.env.BOT_TOKEN);
