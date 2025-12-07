import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandManager, defineCommand, BakitClient } from "../src/index.js";

describe("CommandManager", () => {
	let manager: CommandManager;

	beforeEach(() => {
		const client = new BakitClient({ intents: [] });
		manager = client.managers.commands;
	});

	it("adds, retrieves, and removes manager correctly", () => {
		const command1 = defineCommand("1");
		const command2 = defineCommand("2");
		const command3 = defineCommand("3");

		manager.add(command1);
		manager.add(command2);
		manager.add(command3);

		expect(manager.commands.size).toBe(3);
		expect(manager.get("2")).toBe(command2);

		const removed = manager.remove("1");

		expect(removed).toBe(command1);
		expect(manager.commands.size).toBe(2);
		expect(manager.get("1")).toBe(undefined);
	});

	it("warns when adding duplicate command names", () => {
		const command = defineCommand("dup");
		manager.add(command);

		const spy = vi.spyOn(console, "warn").mockImplementation(() => null);
		manager.add(command);

		expect(spy).toHaveBeenCalledWith(expect.stringContaining("Duplicate"));
		spy.mockRestore();
	});

	it("throws when adding invalid command instances", () => {
		expect(() => {
			manager.add({} as unknown as never);
		}).toThrowError("Invalid command provided");
	});
});
