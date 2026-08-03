import { pathToFileURL } from "node:url";

import type { GlobOptions } from "bakit";

export interface CommandConfig extends GlobOptions {
	pattern: string | readonly string[];
	token: string;
	applicationId: string;
	guildId?: string;
}

export function defineConfig(config: CommandConfig): CommandConfig {
	return config;
}

export async function loadConfig(path: string): Promise<CommandConfig> {
	const module = await import(pathToFileURL(path).href);

	return module.default;
}
