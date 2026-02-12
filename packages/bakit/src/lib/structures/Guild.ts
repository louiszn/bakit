import { Collection } from "@discordjs/collection";

import { BaseStructure } from "./BaseStructure.js";

import { createChannel } from "../utils/channel.js";

import type { Client } from "../client/Client.js";
import type { APIGuild, GatewayGuildCreateDispatchData, GatewayGuildUpdateDispatchData } from "discord-api-types/v10";
import type { Channel } from "./channel/BaseChannel.js";

export type GuildPayload = APIGuild | GatewayGuildUpdateDispatchData | GatewayGuildCreateDispatchData;

export class Guild extends BaseStructure {
	private cachedChannels: Collection<string, Channel> | undefined;

	public constructor(
		client: Client,
		public data: GuildPayload,
	) {
		super(client);
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

	public get channels() {
		if (!this.cachedChannels) {
			this.cachedChannels = new Collection();

			if ("channels" in this.data) {
				for (const data of this.data.channels) {
					const channel = createChannel(this.client, data);

					if (!channel) {
						continue;
					}

					this.cachedChannels.set(channel.id, channel);
				}
			}
		}

		return this.cachedChannels;
	}

	public _patch(data: Partial<GuildPayload>) {
		this.data = { ...this.data, ...data };
	}

	// public get roles() {
	// 	return this.data.roles;
	// }
}
