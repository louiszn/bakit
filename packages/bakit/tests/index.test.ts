import { describe, expect, test } from "vitest";
import { Arg, Command, CommandRegistry, type Context } from "../src/index.js";
import { User } from "discord.js";

describe("index", () => {
	test("hook", () => {
		const Ping = Command("ping");
		const Avatar = Command("avatar");

		@Command.use(Ping)
		class PingCommand {
			@Ping.main
			public execute() {}
		}

		@Command.use(Avatar)
		class AvatarCommand {
			@Avatar.main
			public execute(
				_ctx: Context,
				@Arg.user({ name: "user", required: false }) _user: User | null,
			) {}
		}

		CommandRegistry.add(PingCommand);
		CommandRegistry.add(AvatarCommand);

		expect(CommandRegistry.constructors.size).toBeGreaterThan(0);
	});
});
