export interface MessageReference {
	readonly id: Snowflake;
	readonly channelId: Snowflake;
}

export interface CreateMessageOptions {
	content?: string;
	reply?: MessageReference | string;
}

export type ReplyMessageOptions = Omit<CreateMessageOptions, "reply">;
