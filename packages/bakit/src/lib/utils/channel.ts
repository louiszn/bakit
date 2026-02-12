import { GuildTextChannel, GuildVoiceChannel, type BaseChannelPayload } from "../structures/index.js";
import { ChannelType, type APITextBasedChannel, type APIVoiceChannelBase } from "discord-api-types/v10";

import type { Client } from "../client/Client.js";

export function createChannel(client: Client, data: BaseChannelPayload) {
	switch (data.type) {
		case ChannelType.GuildText:
			return new GuildTextChannel(client, data as APITextBasedChannel<ChannelType.GuildText>);
		case ChannelType.GuildVoice:
			return new GuildVoiceChannel(client, data as APIVoiceChannelBase<ChannelType.GuildVoice>);
		default:
			return null;
	}
}
