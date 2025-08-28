import { User } from "discord.js";
import { Command, Arg, type Context } from "bakit";

const _root = Command.create("avatar");

@Command.use(_root)
export default class AvatarCommand {
	@_root.main
	public async execute(ctx: Context, @Arg.user({ name: "user", required: false }) user?: User) {
		if (!user) {
			user = ctx.author;
		}

		await ctx.send(
			user.displayAvatarURL({
				size: 4096,
				extension: "png",
				forceStatic: false,
			}),
		);
	}
}
