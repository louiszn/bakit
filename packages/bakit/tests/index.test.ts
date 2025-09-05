import { describe, expect, test } from "vitest";
import { Command, CommandRegistry } from "../src/index.js";

describe("index", () => {
	test("hook", () => {
		const Ping = Command("ping");

		@Command.use(Ping)
		class PingCommand {
			@Ping.main
			public execute() {}
		}

		CommandRegistry.add(PingCommand);

		expect(CommandRegistry.constructors.size).toBeGreaterThan(0);
	});
});
