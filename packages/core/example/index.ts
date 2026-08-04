import { Client, ClientEvent, Intent, MessageFlag } from "../src";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	throw new Error("Token is not specified");
}

const client = new Client({
	token: BOT_TOKEN,
	intents: [Intent.Guilds, Intent.GuildMessageReactions],
});

client.on(ClientEvent.GuildCreate, async (event) => {
	const guild = await event.guild.resolve();
	console.log("Guild create:", guild.name);
});

client.on(ClientEvent.GuildAvailable, async (event) => {
	const guild = await event.guild.resolve();
	console.log("Guild available:", guild.name);
});

client.on(ClientEvent.MessageReactionAdd, async (event) => {
	const user = await event.user.resolve();
	console.log(`${user.tag} reacted: ${event.reaction.key}`);
});

client.on(ClientEvent.Ready, async (event) => {
	const user = await event.user.resolve();
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
