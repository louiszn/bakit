import { Arg, Command, Context } from "../../../src/index.js";
import { User } from "discord.js";

const Avatar = Command("avatar");

@Command.use(Avatar)
export default class AvatarCommand {
	@Avatar.main
	public async execute(
		context: Context,
		@Arg.user({ name: "user", required: false }) user: User | null,
	) {
		if (!user) {
			user = context.author;
		}

		await context.send(user.displayAvatarURL({ size: 4096 }));
	}
}
