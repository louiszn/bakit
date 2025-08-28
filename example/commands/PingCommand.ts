import { Command, type Context } from "bakit";

const _root = Command.create("ping");

@Command.use(_root)
export default class PingCommand {
	@_root.main
	public async execute(ctx: Context) {
		await ctx.send(`Pong! ${String(ctx.client.ws.ping)}ms`);
	}
}
