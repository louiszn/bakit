import type { GatewayTypingStartDispatchData } from "discord-api-types/v10";
import type { Client } from "../client/Client.js";
import { BaseStructure } from "./BaseStructure.js";

export type TypingPayload = GatewayTypingStartDispatchData;

export class Typing extends BaseStructure {
	public constructor(
		client: Client,
		public data: TypingPayload,
	) {
		super(client);
	}

	public get channelId() {
		return this.data.channel_id;
	}

	public get guildId() {
		return this.data.guild_id;
	}

	public get userId() {
		return this.data.user_id;
	}

	public get timestamp() {
		return this.data.timestamp;
	}

	public get member() {
		return this.data.member;
	}

	public get channel() {
		return this.guild?.channels.get(this.channelId) ?? this.client.cache.channels.get(this.channelId);
	}

	public get guild() {
		if (this.data.guild_id) {
			return this.client.cache.guilds.get(this.data.guild_id);
		}

		return undefined;
	}
}
