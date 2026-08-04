import type { ValueOf } from "type-fest";

export const GuildState = {
	Available: 0,
	Unavailable: 1,
};

export type GuildState = ValueOf<typeof GuildState>;
