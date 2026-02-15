import { createMixin } from "tiny-mixin";

import { type AbstractConstructor } from "@bakit/utils";

import type { BaseChannel } from "../structures/channel/BaseChannel.js";
import type {
	APIGuildChannel,
	APITextBasedChannel,
	APIVoiceChannelBase,
	ChannelType,
	GuildChannelType,
} from "discord-api-types/v10";
import type { MessageCreateOptions } from "../managers/client/ClientChannelManager.js";

type TextChannelBase = BaseChannel<APITextBasedChannel<ChannelType>>;
type VoiceChannelBase = BaseChannel<APIVoiceChannelBase<GuildChannelType>>;
type GuildChannelBase = BaseChannel<APIGuildChannel>;

export const TextBasedChannelMixin = createMixin(<T extends AbstractConstructor<TextChannelBase>>(base: T) => {
	abstract class TextBasedChannel extends base {
		public get lastMessageId() {
			return this.data.last_message_id ?? undefined;
		}

		public get rateLimitPerUser() {
			return this.data.rate_limit_per_user;
		}

		public send(options: MessageCreateOptions | string) {
			return this.client.channels.createMessage(this.id, options);
		}
	}

	return TextBasedChannel;
});

// TODO: add voice methods
export const VoiceBasedChannelMixin = createMixin(<T extends AbstractConstructor<VoiceChannelBase>>(base: T) => {
	abstract class VoiceBasedChannel extends base {}

	return VoiceBasedChannel;
});

export const GuildChannelMixin = createMixin(<T extends AbstractConstructor<GuildChannelBase>>(base: T) => {
	abstract class GuildChannel extends base {
		public get parentId() {
			return this.data.parent_id ?? undefined;
		}

		public get parent(): GuildChannel | undefined {
			return this.parentId ? (this.client.cache.channels.get(this.parentId) as GuildChannel | undefined) : undefined;
		}

		public get guildId() {
			if (!this.data.guild_id) {
				throw new Error("This channel is not a guild channel");
			}

			return this.data.guild_id;
		}

		public get guild() {
			return this.client.cache.guilds.get(this.guildId)!;
		}
	}

	return GuildChannel;
});
