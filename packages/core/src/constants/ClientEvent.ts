import type { ValueOf } from "type-fest";

export const ClientEvent = {
	Raw: "raw",
	Ready: "ready",

	MessageCreate: "messageCreate",
	MessageUpdate: "messageUpdate",
	MessageDelete: "messageDelete",

	MessageReactionAdd: "messageReactionAdd",
	MessageReactionRemove: "messageReactionRemove",
	MessageReactionRemoveAll: "messageReactionRemoveAll",
	MessageReactionRemoveEmoji: "messageReactionRemoveEmoji",

	InteractionCreate: "interactionCreate",

	GuildCreate: "guildCreate",
	GuildDelete: "guildDelete",
	GuildAvailable: "guildAvailable",
	GuildUnavailable: "guildUnavailable",
} as const;

export type ClientEvent = ValueOf<typeof ClientEvent>;
