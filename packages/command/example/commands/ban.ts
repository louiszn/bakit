import { Parameters, useCommand } from "../../src";

export const ping = useCommand({
	name: "ban",
	parameters: {
		name: Parameters.string({ required: true, aliases: ["u"] }),
		reason: Parameters.string({ aliases: ["r"] }),
		age: Parameters.number(),
	},
	async execute(ctx) {
		const { name, reason } = ctx.values;

		await ctx.send(`Banned ${name} with reason: ${reason || "no reason"}`);
	},
});
