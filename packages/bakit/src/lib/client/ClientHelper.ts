import { type APIUser, Routes } from "discord-api-types/v10";

import { Message } from "../structures/Message.js";
import { Guild } from "../structures/Guild.js";

import type { Client } from "./Client.js";
import type {
	APIAllowedMentions,
	APIEmbed,
	APIMessageReference,
	APIMessage,
	APIGuild,
	APIChannel,
	APIDMChannel,
	RESTPostAPICurrentUserCreateDMChannelJSONBody,
	RESTPatchAPIChannelMessageJSONBody,
} from "discord-api-types/v10";
import { createChannel } from "../utils/channel.js";
import { User } from "../structures/User.js";
import type { Channel } from "../structures/index.js";
import { DMChannel } from "../structures/channel/DMChannel.js";

export interface MessageCreateOptions {
	content?: string;
	tts?: boolean;

	embeds?: APIEmbed[];

	allowedMentions?: APIAllowedMentions;
	messageReference?: APIMessageReference;

	flags?: number;
}

export type MessageReplyOptions = Omit<MessageCreateOptions, "messageReference">;
export type MessageEditOptions = Omit<MessageCreateOptions, "messageReference">;

export class ClientHelper {
	declare public readonly client: Client;

	public constructor(client: Client) {
		Object.defineProperty(this, "client", {
			value: client,
			enumerable: false,
			writable: false,
		});
	}

	public async fetchUser(userId: string, force = false): Promise<User> {
		let user: User | undefined;

		if (this.client.cache.isModuleEnabled("users")) {
			user = await this.client.cache.users.get(userId);
		}

		if (!user || force) {
			const data = await this.client.rest.get<APIUser>(Routes.user(userId));

			if (this.client.cache.isModuleEnabled("users")) {
				user = await this.client.cache.resolve(
					this.client.cache.users,
					userId,
					() => new User(this.client, data),
					(u) => u!._patch(data),
				);
			} else {
				user = new User(this.client, data);
			}
		}

		return user;
	}

	public async createDM(userId: string, force = false): Promise<DMChannel> {
		if (!force) {
			const channel = this.client.cache.channels.find((c) => c.isDM() && c.recipientId === userId);

			if (channel && channel.isDM()) {
				return channel;
			}
		}

		const data = await this.client.rest.post<APIDMChannel, RESTPostAPICurrentUserCreateDMChannelJSONBody>(
			Routes.userChannels(),
			{
				body: { recipient_id: userId },
			},
		);

		const channel = new DMChannel(this.client, data);

		await channel.fetchRecipients();
		this.client.cache.channels.set(channel.id, channel);

		return channel;
	}

	public async fetchMessage(channelId: string, messageId: string, force = false) {
		let message: Message | undefined;

		if (this.client.cache.isModuleEnabled("messages")) {
			message = await this.client.cache.messages.get(messageId);
		}

		if (!message || force) {
			const data = await this.client.rest.get<APIMessage>(Routes.channelMessage(channelId, messageId));

			if (this.client.cache.isModuleEnabled("messages")) {
				message = await this.client.cache.resolve(
					this.client.cache.messages,
					messageId,
					() => new Message(this.client, data),
					(m) => m._patch(data),
				);
			} else {
				message = new Message(this.client, data);
			}
		}

		return message;
	}

	public async deleteMessage(channelId: string, messageId: string) {
		await this.client.rest.delete(Routes.channelMessage(channelId, messageId));

		if (this.client.cache.isModuleEnabled("messages")) {
			await this.client.cache.messages.delete(messageId);
		}
	}

	public async createMessage(channelId: string, options: MessageCreateOptions | string) {
		if (typeof options === "string") {
			options = { content: options };
		}

		const data = this.client.rest.post<APIMessage>(Routes.channelMessages(channelId), {
			body: ClientHelper.toAPICreateMessagePayload(options),
		});

		const message = new Message(this.client, await data);

		if (this.client.cache.isModuleEnabled("messages")) {
			await this.client.cache.messages.set(message.id, message);
		}

		return message;
	}

	public async editMessage(channelId: string, messageId: string, options: MessageEditOptions | string) {
		if (typeof options === "string") {
			options = { content: options };
		}

		const data = await this.client.rest.patch<APIMessage, RESTPatchAPIChannelMessageJSONBody>(
			Routes.channelMessage(channelId, messageId),
			{
				body: ClientHelper.toAPICreateMessagePayload(options),
			},
		);

		let message: Message;

		if (this.client.cache.isModuleEnabled("messages")) {
			message = await this.client.cache.resolve(
				this.client.cache.messages,
				messageId,
				() => new Message(this.client, data),
				(m) => m._patch(data),
			);
		} else {
			message = new Message(this.client, data);
		}

		return message;
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

	public async fetchGuild(guildId: string, force = false) {
		let guild = this.client.cache.guilds.get(guildId);

		if (!guild || force) {
			const data = await this.client.rest.get<APIGuild>(Routes.guild(guildId));
			guild = new Guild(this.client, data);

			this.client.cache.guilds.set(guildId, guild);
		}

		return guild;
	}

	public async fetchChannel<C extends Channel>(channelId: string, force = false): Promise<C> {
		let channel = this.client.cache.channels.get(channelId);

		if (!channel || force) {
			const data = await this.client.rest.get<APIChannel>(Routes.channel(channelId));
			channel = createChannel(this.client, data) ?? undefined;

			if (!channel) {
				throw new Error(`Channel not found: ${channelId}`);
			}

			this.client.cache.channels.set(channelId, channel);

			if (channel.inGuild()) {
				channel.guild.channels.set(channelId, channel);
			}
		}

		return channel as C;
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
