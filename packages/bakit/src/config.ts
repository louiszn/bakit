import { type ClientOptions, GatewayIntentBits } from "discord.js";
import z from "zod";

import glob from "tiny-glob";

import { importModule } from "./lib/index.js";

export const ProjectConfigSchema = z.object({
	/**
	 * The gateway intents to use for the Discord client.
	 *
	 * - `auto` — automatically determine the required intents.
	 * - bigint — a raw bitfield value representing the combined intents.
	 * - array — a list of individual intent flags from `GatewayIntentBits`.
	 *
	 * @defaultvalue `auto`
	 */
	intents: z.union([z.literal("auto"), z.bigint(), z.array(z.enum(GatewayIntentBits))]).default("auto"),
	/**
	 * Optional custom client options for Discord.js (excluding `intents`).
	 *
	 * These are passed directly to the `Client` constructor when initializing the bot.
	 *
	 * @see {@link https://discord.js.org/docs/packages/discord.js/main/ClientOptions:Interface}
	 */
	clientOptions: z.custom<Omit<ClientOptions, "intents">>().optional(),
	prefixes: z.array(z.string()).default([]),
	token: z.string(),
});

export type ProjectConfigInput = z.input<typeof ProjectConfigSchema>;
export type ProjectConfig = z.output<typeof ProjectConfigSchema>;

/**
 * Define config object for your project. This is just a cleaner way to define config.
 * @param config The partial version of project config.
 * @returns The same config you provided earlier.
 */
export function defineConfig(config: ProjectConfigInput): ProjectConfigInput {
	return config;
}

let _config: ProjectConfig | undefined;

/**
 * Load the config file and save them for later usage.
 * @param cwd The location of the config file, uses root by default.
 * @returns The complete config with default values from the validation.
 */
export async function loadConfig(cwd = process.cwd()): Promise<ProjectConfig> {
	if (_config) {
		console.warn("loadConfig() was called more than once. This shouldn't happen.");
		return _config;
	}

	// Support multiple config file extensions
	// The order of getting config is from left to right
	const extensions = ["ts", "js"];
	const globPattern = `bakit.config.{${extensions.join(",")}}`;

	const [configPath, other] = await glob(globPattern, {
		cwd: cwd.replace(/\\/g, "/"), // ensure the path uses `/` instead of `\` on Windows
		absolute: true,
	});

	if (!configPath) {
		throw new Error("Missing config file");
	}

	if (other) {
		console.warn(`Multiple config files found in ${cwd}. Using ${configPath}.`);
	}

	const config = await importModule<ProjectConfig>(configPath, true);
	_config = Object.freeze(await ProjectConfigSchema.parseAsync(config));

	return _config;
}

/**
 * Get the loaded config of the project.
 * @returns The project config.
 */
export function getConfig(): ProjectConfig {
	if (!_config) {
		throw new Error("Project config is not loaded.");
	}

	return _config;
}
