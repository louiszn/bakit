import { User } from "discord.js";
import { Command, Arg, type Context } from "bakit";

const Avatar = Command("avatar");

@Command.use(Avatar)
export default class AvatarCommand {
	@Avatar.main
	public async execute(
		ctx: Context,
		@Arg.user({ name: "target", required: false }) user: User | null,
	) {
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
