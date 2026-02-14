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

export type BaseChannelPayload =
	| APIChannelBase<ChannelType>
	| GatewayChannelCreateDispatchData
	| GatewayChannelUpdateDispatchData
	| APIChannel;

export type TextBasedChannel = GuildTextChannel | GuildVoiceChannel | DMChannel;
export type VoiceBasedChannel = GuildVoiceChannel;
export type GuildChannel = GuildTextChannel | GuildVoiceChannel;

export type Channel = TextBasedChannel | VoiceBasedChannel | GuildChannel | BaseChannel<BaseChannelPayload>;

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

	public isDM(): this is DMChannel {
		return this.type === ChannelType.DM;
	}

	public inGuild(): this is GuildChannel {
		return "guild_id" in this.data;
	}

	public fetch(): Promise<this> {
		return this.client.helper.fetchChannel<this>(this.id, true);
	}

	public _patch(data: Partial<D>) {
		this.data = { ...this.data, ...data };
	}
}
