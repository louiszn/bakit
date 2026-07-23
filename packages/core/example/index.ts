import { Client, ClientEvent, Intent, MessageFlag } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const client = new Client({
	token: BOT_TOKEN,
	intents: [Intent.Guilds],
});

client.on(ClientEvent.Ready, async (event) => {
	const user = await event.user.resolve(true);
	console.log(`Logged in as ${user.tag}`);
});

client.on(ClientEvent.InteractionCreate, async ({ interaction }) => {
	if (!interaction.isChatInputCommand()) {
		return;
	}

	if (interaction.commandName === "ping") {
		await interaction.reply({
			content: "Pong!",
			flags: [MessageFlag.Ephemeral],
		});
	}
});

await client.start();
