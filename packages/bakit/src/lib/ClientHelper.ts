import { Routes } from "discord-api-types/v10";
import { Message } from "./structures/Message.js";
import type { Client } from "./Client.js";

import type { APIAllowedMentions, APIEmbed, APIMessageReference, APIMessage } from "discord-api-types/v10";

export interface MessageCreateOptions {
	content?: string;
	tts?: boolean;

	embeds?: APIEmbed[];

	allowedMentions?: APIAllowedMentions;
	messageReference?: APIMessageReference;

	flags?: number;
}

export type MessageReplyOptions = Omit<MessageCreateOptions, "messageReference">;

export class ClientHelper {
	declare public readonly client: Client;

	public constructor(client: Client) {
		Object.defineProperty(this, "client", {
			value: client,
			enumerable: false,
			writable: false,
		});
	}

	public async fetchMessage(channelId: string, messageId: string) {
		const data = await this.client.rest.get<APIMessage>(Routes.channelMessage(channelId, messageId));
		return new Message(this.client, data);
	}

	public async deleteMessage(channelId: string, messageId: string) {
		return this.client.rest.delete(Routes.channelMessage(channelId, messageId));
	}

	public async createMessage(channelId: string, options: MessageCreateOptions) {
		return this.client.rest.post<APIMessage>(Routes.channelMessages(channelId), {
			body: ClientHelper.toAPICreateMessagePayload(options),
		});
	}

	public async replyMessage(channelId: string, messageId: string, options: MessageReplyOptions) {
		return this.createMessage(channelId, {
			...options,
			messageReference: {
				channel_id: channelId,
				message_id: messageId,
			},
		});
	}

	public static toAPICreateMessagePayload(options: MessageCreateOptions) {
		return {
			content: options.content,
			tts: options.tts,
			embeds: options.embeds,
			allowed_mentions: options.allowedMentions,
			message_reference: options.messageReference,
			flags: options.flags,
		};
	}
}
