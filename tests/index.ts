import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { useCommand } from "../src/command/command.js";
import { CommandRegistry, entry, Context } from "../src/command/index.js";
import { BakitClient } from "../src/BakitClient.js";

const client = new BakitClient({
	intents: [GatewayIntentBits.Guilds],
	prefixes: ["!"],
	enableMentionPrefix: true,
});

@useCommand("ping")
class PingCommand {
	@entry.main()
	public execute(_ctx: Context) {}
}

CommandRegistry.add(PingCommand);

await client.login(process.env.BOT_TOKEN);
