import { applyMixins } from "tiny-mixin";

import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin, TextBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";

import type { APINewsChannel } from "discord-api-types/v10";

export class GuildAnnouncementChannel extends applyMixins(BaseChannel<APINewsChannel>, [
	GuildChannelMixin,
	TextBasedChannelMixin,
]) {
	public crosspost(messageId: string) {
		return this.client.channels.crosspost(this.id, messageId);
	}
}
