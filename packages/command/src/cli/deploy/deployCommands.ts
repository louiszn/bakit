import type { RootCommand } from "@bakit/command";
import { REST, Routes } from "bakit";

import { transformCommands } from "./transform";

export interface DeployCommandsOptions {
	token: string;
	applicationId: string;
	guildId?: string;

	commands: readonly RootCommand[];
}

export async function deployCommands(options: DeployCommandsOptions): Promise<void> {
	const rest = new REST().setToken(options.token);

	const body = transformCommands(options.commands);

	if (options.guildId) {
		await rest.put(Routes.applicationGuildCommands(options.applicationId, options.guildId), {
			body,
		});

		return;
	}

	await rest.put(Routes.applicationCommands(options.applicationId), { body });
}
