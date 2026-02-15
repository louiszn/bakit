import { Collection } from "@discordjs/collection";

import { BaseStructure } from "./BaseStructure.js";

import type { Client } from "../client/Client.js";
import type { APIGuild, GatewayGuildCreateDispatchData, GatewayGuildUpdateDispatchData } from "discord-api-types/v10";
import type { Channel } from "./channel/BaseChannel.js";
import { ClientChannelManager } from "../managers/client/ClientChannelManager.js";

export type GuildPayload = APIGuild | GatewayGuildUpdateDispatchData | GatewayGuildCreateDispatchData;

export class Guild extends BaseStructure {
	public readonly channels = new Collection<string, Channel>();

	public constructor(
		client: Client,
		public data: GuildPayload,
	) {
		super(client);

		this.#initChannels();
	}

	public get id() {
		return this.data.id;
	}

	public get name() {
		return this.data.name;
	}

	public get icon() {
		return this.data.icon;
	}

	public get banner() {
		return this.data.banner;
	}

	public get owner() {
		return this.data.owner_id;
	}

	public get mfaLevel() {
		return this.data.mfa_level;
	}

	public get verificationLevel() {
		return this.data.verification_level;
	}

	public _patch(data: Partial<GuildPayload>) {
		this.data = { ...this.data, ...data };
		this.#initChannels();
	}

	#initChannels() {
		if (!("channels" in this.data)) {
			return;
		}

		for (const id of this.channels.keys()) {
			this.client.cache.channels.delete(id);
		}

		this.channels.clear();

		for (const channelData of this.data.channels) {
			const channel = ClientChannelManager.create(this.client, channelData);

			if (channel) {
				this.channels.set(channel.id, channel);
				this.client.cache.channels.set(channel.id, channel);
			}
		}
	}
}
