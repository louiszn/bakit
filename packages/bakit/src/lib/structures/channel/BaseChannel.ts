import { BaseStructure } from "../BaseStructure.js";

import type { Client } from "../../client/Client.js";
import type {
	APIChannel,
	APIChannelBase,
	ChannelType,
	GatewayChannelCreateDispatchData,
	GatewayChannelUpdateDispatchData,
} from "discord-api-types/v10";

import type { GuildTextChannel } from "./GuildTextChannel.js";
import type { GuildVoiceChannel } from "./GuildVoiceChannel.js";

export type BaseChannelPayload =
	| APIChannelBase<ChannelType>
	| GatewayChannelCreateDispatchData
	| GatewayChannelUpdateDispatchData
	| APIChannel;

export type TextBasedChannel = GuildTextChannel | GuildVoiceChannel;
export type VoiceBasedChannel = GuildVoiceChannel;
export type GuildChannel = GuildTextChannel | GuildVoiceChannel;

export type Channel = TextBasedChannel | VoiceBasedChannel | GuildChannel;

export abstract class BaseChannel<D extends BaseChannelPayload> extends BaseStructure {
	public constructor(
		client: Client,
		public data: D,
	) {
		super(client);
	}

	public get id() {
		return this.data.id;
	}

	public get type() {
		return this.data.type;
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

	public inGuild(): this is GuildChannel {
		return "guild_id" in this.data;
	}

	public _patch(data: Partial<D>) {
		this.data = { ...this.data, ...data };
	}
}
