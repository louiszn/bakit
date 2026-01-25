import { createChannel, type Channel } from "@/lib/structures/channel.js";

import type { Client } from "../index.js";

import type { Snowflake } from "discord-api-types/globals";
import type { APIChannel, APIMessage, MessageFlags, RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import { createMessage, type Message } from "@/lib/structures/message.js";

export interface CreateMessageOptions {
	content?: string;
	flags?: MessageFlags;
}

export function createChannelHelpers(client: Client) {
	return {
		async getById(id: Snowflake): Promise<Channel | undefined> {
			try {
				const data = await client.rest.get<APIChannel>(`/channels/${id}`);
				return createChannel(client, data);
			} catch {
				return undefined;
			}
		},

		async createMessage(channelId: Snowflake, options: CreateMessageOptions | string): Promise<Message> {
			if (typeof options === "string") {
				options = { content: options };
			}

			const message = await client.rest.post<APIMessage, RESTPostAPIChannelMessageJSONBody>(
				`/channels/${channelId}/messages`,
				{
					content: options.content,
					flags: options.flags,
				},
			);

			return createMessage(client, message);
		},

		async deleteMessage(channelId: Snowflake, messageId: Snowflake) {
			await client.rest.delete(`/channels/${channelId}/messages/${messageId}`);
		},
	};
}
