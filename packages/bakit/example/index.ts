import { Client, GatewayIntentBits } from "../src";

const BOT_TOKEN = process.env["BOT_TOKEN"];
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const client = new Client({
	token: BOT_TOKEN,
	intents: GatewayIntentBits.Guilds,
});

client.on("ready", async (event) => {
	const user = await event.user.resolve(true);
	console.log(`Logged in as ${user.displayName}`);
});

await client.start();
