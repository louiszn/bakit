import {
	GatewayDispatchEvents,
	type GatewayChannelCreateDispatch,
	type GatewayChannelUpdateDispatch,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";

import { ClientChannelManager } from "@/lib/managers/client/ClientChannelManager.js";
import { Partial } from "../../Partial.js";

import type { Client } from "../../Client.js";
import type { Channel } from "@/lib/structures/index.js";

async function onCreateOrUpdate(client: Client, payload: GatewayChannelCreateDispatch | GatewayChannelUpdateDispatch) {
	let channel: Channel | undefined = client.cache.channels.get(payload.d.id);

	if (channel && channel.type === payload.d.type) {
		channel._patch(payload.d as never);
	} else {
		channel = ClientChannelManager.create(client, payload.d);
		client.cache.channels.set(payload.d.id, channel);
	}

	if (channel.inGuild() && !channel.guild.channels.has(channel.id)) {
		channel.guild.channels.set(channel.id, channel);
	}

	if (channel.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit(payload.t === GatewayDispatchEvents.ChannelCreate ? "channelCreate" : "channelUpdate", channel);
}

registerHandler(GatewayDispatchEvents.ChannelCreate, onCreateOrUpdate);
registerHandler(GatewayDispatchEvents.ChannelUpdate, onCreateOrUpdate);

registerHandler(GatewayDispatchEvents.ChannelDelete, async (client, payload) => {
	const channel = client.channels.resolve(payload.d);
	const guild = client.cache.guilds.get(payload.d.guild_id);

	if (guild) {
		guild.channels.delete(payload.d.id);
	}

	client.cache.channels.delete(payload.d.id);

	if (!channel.partial || client.options.partials.has(Partial.Channel)) {
		client.emit("channelDelete", channel);
	}

	if (client.cache.isModuleEnabled("messages")) {
		await Promise.all(
			client.cache.messages.local.map((message) => {
				if (message.channelId !== payload.d.id) {
					return;
				}

				return client.cache.messages.delete(message.id);
			}),
		);
	}
});
