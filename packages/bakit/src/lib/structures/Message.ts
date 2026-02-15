import { BaseStructure } from "./BaseStructure.js";
import { User } from "./User.js";

import type { Client } from "../client/Client.js";
import {
	ChannelType,
	type APIMessage,
	type GatewayMessageCreateDispatchData,
	type GatewayMessageUpdateDispatchData,
} from "discord-api-types/v10";
import type { MessageEditOptions, MessageReplyOptions } from "../managers/client/index.js";
import type { GuildChannel, TextBasedChannel } from "./channel/BaseChannel.js";
import type { Guild } from "./Guild.js";

export type MessagePayload = APIMessage | GatewayMessageCreateDispatchData | GatewayMessageUpdateDispatchData;

export class Message<InGuild extends boolean = boolean> extends BaseStructure {
	#cachedAuthor?: User;

	public constructor(
		client: Client,
		public data: MessagePayload,
	) {
		super(client);
		this.#ensureChannelCache();
	}

	public get partial() {
		return typeof this.data.content !== "string" || typeof this.data.author !== "object" || this.channel === undefined;
	}

	public get content() {
		return this.data.content;
	}

	public get id() {
		return this.data.id;
	}

	public get channelId() {
		return this.data.channel_id;
	}

	public get channel(): InGuild extends true ? TextBasedChannel & GuildChannel : TextBasedChannel {
		return this.#ensureChannelCache() as InGuild extends true ? TextBasedChannel & GuildChannel : TextBasedChannel;
	}

	public get guildId(): InGuild extends true ? string : undefined {
		const guildId = "guild_id" in this.data ? this.data.guild_id : undefined;
		return guildId as InGuild extends true ? string : undefined;
	}

	public get guild(): InGuild extends true ? Guild : undefined {
		const guild = this.guildId ? this.client.cache.guilds.get(this.guildId) : undefined;
		return guild as InGuild extends true ? Guild : undefined;
	}

	/**
	 * The author of this message.
	 *
	 * **Note:** This property returns the cached `User` synchronously.
	 * It may be stale if the users cache has short lifetime or uses an asynchronous remote store.
	 * To ensure the author is up-to-date, use the `fetchAuthor()` method instead.
	 */
	public get author() {
		let author = this.#cachedAuthor;

		if (!author && this.client.cache.isModuleEnabled("users")) {
			author = this.client.cache.resolveLocal(
				this.client.cache.users.local,
				this.data.author.id,
				() => new User(this.client, this.data.author),
				(user) => user._patch(this.data.author),
			);
		}

		if (!author) {
			author = new User(this.client, this.data.author);
		}

		this.#cachedAuthor = author;

		return this.#cachedAuthor;
	}

	public get createdAt() {
		return new Date(this.data.timestamp);
	}

	public get editedAt() {
		return this.data.edited_timestamp ? new Date(this.data.edited_timestamp) : undefined;
	}

	public get createdTimestamp() {
		return this.createdAt.getTime();
	}

	public get editedTimestamp() {
		return this.editedAt?.getTime();
	}

	public get url() {
		return `https://discord.com/channels/${this.guildId ?? "@me"}/${this.channelId}/${this.id}`;
	}

	public inGuild(): this is Message<true> {
		return this.guild !== undefined;
	}

	public async fetch(): Promise<Message> {
		const message = await this.client.helper.fetchMessage(this.channelId, this.id);

		this.data = message.data;
		this.#cachedAuthor = await this.client.cache.resolve(
			this.client.cache.users,
			message.data.author.id,
			() => new User(this.client, message.data.author),
		);

		return this;
	}

	/**
	 * Fetches the author of this message from cache or Discord API.
	 *
	 * **Note:** It is recommended to use this method instead of the `author` property
	 * if the users cache has short lifetime or is backed by an asynchronous remote cache.
	 *
	 * @param force - Whether to bypass the cache and force a request to the API.
	 * @returns A promise that resolves to the `User` who authored this message.
	 */
	public async fetchAuthor(force = false) {
		if (!force && this.client.cache.isModuleEnabled("users")) {
			return this.client.cache.resolve(
				this.client.cache.users,
				this.data.author.id,
				() => new User(this.client, this.data.author),
				(user) => user._patch(this.data.author),
			);
		}

		return this.client.helper.fetchUser(this.data.author.id, force);
	}

	public async reply(options: string | MessageReplyOptions) {
		return this.client.channels.replyMessage(this.channelId, this.id, options);
	}

	public async edit(options: string | MessageEditOptions) {
		return this.client.channels.editMessage(this.channelId, this.id, options);
	}

	public async _patch(data: Partial<MessagePayload>) {
		this.data = { ...this.data, ...data };

		if (data.author && this.client.cache.isModuleEnabled("users")) {
			if (this.client.cache.isModuleEnabled("users")) {
				this.#cachedAuthor = await this.client.cache.resolve(
					this.client.cache.users,
					data.author.id,
					() => new User(this.client, data.author!),
				);
			} else {
				this.#cachedAuthor?._patch(data.author);
			}
		}
	}

	#ensureChannelCache() {
		const { client } = this;

		let channel = client.cache.channels.get(this.channelId) ?? this.guild?.channels.get(this.channelId);

		if (!channel) {
			if (this.guildId) {
				channel = this.client.channels.resolve({
					id: this.channelId,
					type: ChannelType.GuildText,
				});
			} else {
				channel = this.client.channels.resolve({
					id: this.channelId,
					type: ChannelType.DM,
					name: null,
					recipients: [this.data.author],
				});
			}

			if (!channel) {
				throw new Error("Channel not found");
			}

			client.cache.channels.set(this.channelId, channel);
		}

		return channel;
	}

	public override toJSON() {
		return this.data;
	}

	public override toString() {
		return this.data.content;
	}
}
