import "dotenv/config";
import { Events, GatewayIntentBits } from "discord.js";
import { Arg, Command, CommandRegistry, type Context } from "../src/command/index.js";
import { BakitClient } from "../src/index.js";

const client = new BakitClient({
	intents: [GatewayIntentBits.Guilds],
	prefixes: ["!"],
	enableMentionPrefix: true,
});

const _root = Command.create({
	name: "character",
	description: "Character command",
});

const _edit = _root.createGroup({
	name: "edit",
	description: "Character edit",
});

const _editAvatar = _edit.createSubcommand({
	name: "avatar",
	description: "Character edit avatar",
});

@Command.use(_root)
class CharacterCommand {
	@_editAvatar.main
	public executeEditAvatar(context: Context, @Arg.string("avatar") avatar: string) {}
}

CommandRegistry.add(CharacterCommand);

client.on(Events.ClientReady, () => {
	console.log("Bot is ready");
});

await client.login(process.env.BOT_TOKEN);
