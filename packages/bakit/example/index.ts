import { Client, ClientEvent, GatewayIntentBits } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const client = new Client({
	token: BOT_TOKEN,
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
	],
});

client.on(ClientEvent.Ready, async (event) => {
	const user = await event.user.resolve(true);
	console.log(`Logged in as ${user.tag}`);
});

client.on(ClientEvent.MessageCreate, async (event) => {
	const message = await event.message.resolve(true);
	const author = await event.author.resolve(true);

	if (author.bot) {
		return;
	}

	if (message.content.startsWith("!ping")) {
		await message.reply("Pong!");
	}
});

await client.start();
