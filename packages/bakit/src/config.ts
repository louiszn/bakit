import { ClientOptions, GatewayIntentBits } from "discord.js";
import { z } from "zod";

import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ProjectConfigSchema = z.object({
	intents: z
		.union([z.literal("auto"), z.bigint(), z.array(z.enum(GatewayIntentBits))])
		.default("auto"),
	clientOptions: z.custom<Omit<ClientOptions, "intents">>().optional(),
});

export type ProjectConfigInput = z.input<typeof ProjectConfigSchema>;
export type ProjectConfig = z.output<typeof ProjectConfigSchema>;

export function defineConfig(config: ProjectConfigInput): ProjectConfig {
	return ProjectConfigSchema.parse(config);
}

let _config: ProjectConfig | undefined;

export async function loadConfig(): Promise<ProjectConfig> {
	const configPath = pathToFileURL(join(process.cwd(), "bakit.config.ts")).toString();

	const { default: config } = (await import(configPath)) as {
		default: ProjectConfig;
	};

	_config = config;

	return config;
}

export function getConfig(): ProjectConfig {
	if (!_config) {
		throw new Error("Project config is not loaded.");
	}

	return _config;
}
