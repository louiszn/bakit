import {
	ChannelType,
	Routes,
	type APIAllowedMentions,
	type APIChannel,
	type APIDMChannel,
	type APIEmbed,
	type APIGuildForumChannel,
	type APIGuildStageVoiceChannel,
	type APIGuildTextChannel,
	type APIMessage,
	type APIMessageReference,
	type APINewsChannel,
	type APIPublicThreadChannel,
	type APIVoiceChannelBase,
	type GuildTextChannelType,
	type RESTPostAPIGuildChannelJSONBody,
} from "discord-api-types/v10";

import {
	DMChannel,
	GuildAnnouncementChannel,
	GuildStageVoiceChannel,
	GuildTextChannel,
	GuildVoiceChannel,
	GuildForumChannel,
	Message,
	ThreadChannel,
	type BaseChannelPayload,
	type Channel,
	BaseChannel,
} from "../../structures/index.js";

import type { Client } from "../../client/Client.js";
import type { Snowflake } from "discord-api-types/globals";

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

export class ClientChannelManager {
	declare public readonly client: Client;

	public constructor(client: Client) {
		Object.defineProperty(this, "client", {
			value: client,
			enumerable: false,
			writable: false,
		});
	}

	public async fetch<C extends Channel>(id: Snowflake, force = false): Promise<C | undefined> {
		if (!force) {
			const cached = this.client.cache.channels.get(id);

			if (cached) {
				return cached as C;
			}
		}

		const data: APIChannel | undefined = await this.client.rest
			.get<APIChannel>(Routes.channel(id))
			.catch(() => undefined);

		if (!data) {
			return;
		}

		const existing = this.client.cache.channels.get(id);

		// If existing and type matches, patch it in place
		if (existing && existing.type === data.type) {
			(existing as BaseChannel<BaseChannelPayload>)._patch(data);
			return existing as C;
		}

		// Otherwise, create a brand new channel (replaces any mismatched entry)
		const newChannel = ClientChannelManager.create(this.client, data);
		this.client.cache.channels.set(id, newChannel!);

		return newChannel as C;
	}

	public async delete(id: Snowflake, force = false): Promise<Channel | undefined> {
		const channel = this.client.cache.channels.get(id);

		if (!channel && !force) {
			return;
		}

		await this.client.rest.delete(Routes.channel(id));

		if (channel) {
			this.client.cache.channels.delete(id);

			if (channel.inGuild()) {
				channel.guild.channels.delete(id);
			}
		}

		return channel;
	}

	public async create(guildId: Snowflake, payload: RESTPostAPIGuildChannelJSONBody) {
		const data = await this.client.rest.post<APIChannel, RESTPostAPIGuildChannelJSONBody>(
			Routes.guildChannels(guildId),
			{
				body: payload,
			},
		);

		const channel = ClientChannelManager.create(this.client, data)!;

		this.client.cache.channels.set(channel.id, channel);

		if (channel.inGuild()) {
			channel.guild.channels.set(channel.id, channel);
		}

		return channel;
	}

	public async crosspost(channelId: Snowflake, messageId: Snowflake) {
		const data = await this.client.rest.post<APIMessage>(Routes.channelMessageCrosspost(channelId, messageId));
		const message = new Message<true>(this.client, data);

		if (this.client.cache.isModuleEnabled("messages")) {
			await this.client.cache.messages.set(message.id, message);
		}

		return message;
	}

	public async createMessage(channelId: Snowflake, options: MessageCreateOptions | string) {
		if (typeof options === "string") {
			options = { content: options };
		}

		const data = this.client.rest.post<APIMessage>(Routes.channelMessages(channelId), {
			body: ClientChannelManager.createMessagePayload(options),
		});

		const message = new Message(this.client, await data);

		if (this.client.cache.isModuleEnabled("messages")) {
			await this.client.cache.messages.set(message.id, message);
		}

		return message;
	}

	public async editMessage(channelId: Snowflake, messageId: Snowflake, options: MessageEditOptions | string) {
		if (typeof options === "string") {
			options = { content: options };
		}

		const data = await this.client.rest.patch<APIMessage>(Routes.channelMessage(channelId, messageId), {
			body: ClientChannelManager.createMessagePayload(options),
		});

		let message: Message | undefined;

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

	public async deleteMessage(channelId: Snowflake, messageId: Snowflake, force = false) {
		let message: Message | undefined;

		if (!force && this.client.cache.isModuleEnabled("messages")) {
			message = await this.client.cache.messages.get(messageId);

			if (!message) {
				return;
			}
		}

		await this.client.rest.delete(Routes.channelMessage(channelId, messageId));

		if (this.client.cache.isModuleEnabled("messages")) {
			await this.client.cache.messages.delete(messageId);
		}

		return message;
	}

	public async replyMessage(channelId: Snowflake, messageId: Snowflake, options: MessageReplyOptions | string) {
		if (typeof options === "string") {
			options = { content: options };
		}

		return this.createMessage(channelId, {
			...options,
			messageReference: {
				channel_id: channelId,
				message_id: messageId,
			},
		});
	}

	public resolve(data: BaseChannelPayload) {
		return this.client.cache.resolveLocal(
			this.client.cache.channels,
			data.id,
			() => ClientChannelManager.create(this.client, data),
			(c) => c?._patch(data as never),
		);
	}

	public static create(client: Client, data: BaseChannelPayload) {
		switch (data.type) {
			case ChannelType.GuildText:
				return new GuildTextChannel(client, data as APIGuildTextChannel<GuildTextChannelType>);

			case ChannelType.GuildVoice:
				return new GuildVoiceChannel(client, data as APIVoiceChannelBase<ChannelType.GuildVoice>);

			case ChannelType.GuildStageVoice:
				return new GuildStageVoiceChannel(client, data as APIGuildStageVoiceChannel);

			case ChannelType.GuildAnnouncement:
				return new GuildAnnouncementChannel(client, data as APINewsChannel);

			case ChannelType.DM:
				return new DMChannel(client, data as APIDMChannel);

			case ChannelType.GuildForum:
				return new GuildForumChannel(client, data as APIGuildForumChannel);

			case ChannelType.PublicThread:
			case ChannelType.PrivateThread:
			case ChannelType.AnnouncementThread:
				return new ThreadChannel(client, data as APIPublicThreadChannel);
		}

		return new BaseChannel(client, data);
	}

	public joinThread(threadId: Snowflake) {
		return this.client.rest.post(Routes.threadMembers(threadId));
	}

	public static createMessagePayload(options: MessageCreateOptions) {
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
