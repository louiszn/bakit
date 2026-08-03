import { useCommand } from "../../src";

export const ping = useCommand({
	name: "ping",
	async execute(ctx) {
		await ctx.send("Pong!");
		throw new Error("owo");
	},
});
