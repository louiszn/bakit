import type { MessageFlag } from "../constants";

export interface MessageReference {
	readonly id: Snowflake;
	readonly channelId: Snowflake;
}

export interface MessageCreateOptions {
	content?: string;
	reply?: MessageReference | string;
	flags?: number | MessageFlag | readonly MessageFlag[];
}

export type MessageReplyOptions = Omit<MessageCreateOptions, "reply">;
