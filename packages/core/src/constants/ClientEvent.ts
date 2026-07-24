import type { ValueOf } from "type-fest";

export const ClientEvent = {
	Raw: "raw",
	Ready: "ready",
	MessageCreate: "messageCreate",
	MessageUpdate: "messageUpdate",
	MessageDelete: "messageDelete",
	InteractionCreate: "interactionCreate",
} as const;

export type ClientEvent = ValueOf<typeof ClientEvent>;
