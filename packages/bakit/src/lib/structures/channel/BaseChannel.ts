import { BaseStructure } from "../BaseStructure.js";

import type { Client } from "../../client/Client.js";
import {
	ChannelType,
	type APIChannel,
	type APIChannelBase,
	type GatewayChannelCreateDispatchData,
	type GatewayChannelUpdateDispatchData,
} from "discord-api-types/v10";

import type { GuildTextChannel } from "./GuildTextChannel.js";
import type { GuildVoiceChannel } from "./GuildVoiceChannel.js";
import type { DMChannel } from "./DMChannel.js";
import type { ThreadBasedChannel } from "./ThreadChannel.js";
import type { GuildAnnouncementChannel } from "./GuildAnnouncementChannel.js";
import type { GuildStageVoiceChannel } from "./GuildStageVoiceChannel.js";
import type { GuildCategory } from "./GuildCategory.js";

export type BaseChannelPayload =
	| APIChannelBase<ChannelType>
	| GatewayChannelCreateDispatchData
	| GatewayChannelUpdateDispatchData
	| APIChannel;

export type TextBasedChannel =
	| GuildTextChannel
	| GuildVoiceChannel
	| GuildStageVoiceChannel
	| DMChannel
	| GuildAnnouncementChannel
	| ThreadBasedChannel;
export type VoiceBasedChannel = GuildVoiceChannel | GuildStageVoiceChannel;
export type GuildChannel = GuildTextChannel | GuildVoiceChannel | GuildAnnouncementChannel | GuildCategory;

export type Channel = TextBasedChannel | VoiceBasedChannel | GuildChannel | BaseChannel<BaseChannelPayload>;

export class BaseChannel<D extends BaseChannelPayload, Type extends ChannelType = D["type"]> extends BaseStructure {
	public constructor(
		client: Client,
		public data: D,
	) {
		super(client);
	}

	public get partial() {
		return Object.keys(this.data).length <= 2;
	}

	public get id() {
		return this.data.id;
	}

	public get type(): Type {
		return this.data.type as Type;
	}

	public override toString() {
		return `<#${this.id}>`;
	}

	public override toJSON() {
		return this.data;
	}

	public isTextBased(): this is TextBasedChannel {
		return "send" in this;
	}

	public isVoiceBased(): this is VoiceBasedChannel {
		return "join" in this;
	}

	public isDM(): this is DMChannel {
		return this.type === ChannelType.DM;
	}

	public isThread(): this is ThreadBasedChannel {
		return (
			this.type === ChannelType.AnnouncementThread ||
			this.type === ChannelType.PublicThread ||
			this.type === ChannelType.PrivateThread
		);
	}

	public isPublicThread(): this is ThreadBasedChannel {
		return this.type === ChannelType.PublicThread;
	}

	public isPrivateThread(): this is ThreadBasedChannel {
		return this.type === ChannelType.PrivateThread;
	}

	public isAnnouncementThread(): this is ThreadBasedChannel {
		return this.type === ChannelType.AnnouncementThread;
	}

	public isCategory(): this is GuildCategory {
		return this.type === ChannelType.GuildCategory;
	}

	public inGuild(): this is GuildChannel {
		return "guild_id" in this.data;
	}

	public async fetch(): Promise<this> {
		const channel = await this.client.channels.fetch(this.id, true);

		if (!channel) {
			throw new Error("Channel not found");
		}

		return channel as this;
	}

	public _patch(data: Partial<D>) {
		this.data = { ...this.data, ...data };
	}
}
