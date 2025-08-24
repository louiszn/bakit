import { describe, it, expect } from "vitest";
import {
	Arg,
	CommandRegistry,
	Context,
	createGroup,
	Entry,
	entry,
	EntryDecortatorType,
	useCommand,
} from "../src/command/index.js";
import { ApplicationCommandType } from "discord.js";

const testSubcommand = entry.command("test");

const group = createGroup("group");
const groupTest = group.command("test");

@useCommand("ping")
class PingCommand {
	@entry.main()
	public execute(
		_ctx: Context,
		@Arg.string("str") _str: string,
		@Arg.integer("integer") _int: number,
	) {
		console.log(_str);
	}

	@testSubcommand.main()
	public executeTest(_ctx: Context) {}

	@group.main()
	public executeGroup(_ctx: Context) {}

	@groupTest.main()
	public executeGroupTest(_ctx: Context) {}
}

describe("Command", () => {
	const mainHooks = Entry.getHooks(PingCommand);

	it("get hooks", () => {
		expect(mainHooks.length).toBeGreaterThan(0);
		expect(mainHooks[0].type).toBe(EntryDecortatorType.Main);
	});

	it("get args", () => {
		const { method } = mainHooks[0];

		const args = Arg.getMethodArgs(method);

		expect(args.length).toBeGreaterThan(0);
		expect(args[0].type).toBe(Arg.ArgType.String);
	});

	it("get slash command", () => {
		const data = CommandRegistry.getSlashCommandData(PingCommand);

		if (data.type !== ApplicationCommandType.ChatInput) {
			return;
		}

		console.log(data);
	});
});
