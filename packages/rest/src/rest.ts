import type { OptionalKeysOf } from "type-fest";

export interface RestOptions {
	/**
	 * The version of Discord API.
	 * @defaultValue 10
	 */
	version?: number;
	baseURL?: string;
	token: string;
}

export const DEFAULT_REST_OPTIONS = {
	version: 10,
	baseURL: "https://discord.com/api/",
} as const satisfies Pick<RestOptions, OptionalKeysOf<RestOptions>>;

export function createREST(_options: RestOptions) {
	// const resolvedOptions = { ...DEFAULT_REST_OPTIONS, ...options };
}

createREST({
	token: "",
});
