import type {
	APIMessage,
	GatewayMessageCreateDispatchData,
	GatewayMessageUpdateDispatchData,
	Snowflake,
} from "discord-api-types/v10";

import type { MessageFlag } from "#/constants";

export type MessageRaw =
	| GatewayMessageCreateDispatchData
	| GatewayMessageUpdateDispatchData
	| APIMessage;

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
