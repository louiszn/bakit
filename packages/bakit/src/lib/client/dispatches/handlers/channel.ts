import {
	GatewayDispatchEvents,
	type GatewayChannelCreateDispatch,
	type GatewayChannelUpdateDispatch,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { createChannel } from "@/lib/utils/channel.js";

import type { Client } from "../../Client.js";

async function onCreateOrUpdate(client: Client, payload: GatewayChannelCreateDispatch | GatewayChannelUpdateDispatch) {
	const channel = await client.cache.resolve(
		client.cache.channels,
		payload.d.id,
		() => createChannel(client, payload.d),
		(c) => c?._patch(payload.d as never),
	);

	if (!channel) return;

	if (channel.inGuild() && !channel.guild.channels.has(channel.id)) {
		channel.guild.channels.set(channel.id, channel);
	}

	client.emit(payload.t === GatewayDispatchEvents.ChannelCreate ? "channelCreate" : "channelUpdate", channel);
}

registerHandler(GatewayDispatchEvents.ChannelCreate, onCreateOrUpdate);
registerHandler(GatewayDispatchEvents.ChannelUpdate, onCreateOrUpdate);
registerHandler(GatewayDispatchEvents.ChannelDelete, (client, payload) => {
	const channel = client.cache.channels.get(payload.d.id);
	const guild = client.cache.guilds.get(payload.d.guild_id);

	if (guild) {
		guild.channels.delete(payload.d.id);
	}

	if (!channel) {
		return;
	}

	client.cache.channels.delete(payload.d.id);

	client.emit("channelDelete", channel);
});
