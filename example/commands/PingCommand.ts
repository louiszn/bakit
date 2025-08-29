import { Command, type Context } from "bakit";

const Ping = Command("ping");

@Command.use(Ping)
export default class PingCommand {
	@Ping.main
	public async execute(ctx: Context) {
		await ctx.send(`Pong! ${String(ctx.client.ws.ping)}ms`);
	}
}
