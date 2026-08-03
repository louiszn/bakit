#!/usr/bin/env node

import { resolve } from "node:path";

import { loadCommands, loadConfig } from "@bakit/command";
import { REST, Routes } from "bakit";
import { Command } from "commander";

import { transformCommands } from "./deploy/transform";

const program = new Command();

program.name("@bakit/command").description("Bakit command utilities");

async function deploy(configFile: string) {
	const config = await loadConfig(configFile);

	const commands = await loadCommands(config);

	console.log(`Loaded ${commands.length} command(s).`);

	const body = transformCommands(commands);

	const rest = new REST({
		version: "10",
	}).setToken(config.token);

	const route = config.guildId
		? Routes.applicationGuildCommands(config.applicationId, config.guildId)
		: Routes.applicationCommands(config.applicationId);

	await rest.put(route, {
		body,
	});

	console.log(`✓ Deployed ${body.length} command(s).`);
}

program
	.command("deploy")
	.description("Deploy application commands")
	.option("-c, --config <file>", "Path to commands config", "commands.config.ts")
	.action(async ({ config }) => {
		await deploy(resolve(process.cwd(), config));
	});

await program.parseAsync();
