import {
	GatewayDispatchEvents,
	type GatewayGuildCreateDispatch,
	type GatewayGuildUpdateDispatch,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { Guild } from "@/lib/structures/index.js";

import type { Client } from "../../Client.js";

async function onCreateAndUpdate(client: Client, payload: GatewayGuildCreateDispatch | GatewayGuildUpdateDispatch) {
	const guild = await client.cache.resolve(
		client.cache.guilds,
		payload.d.id,
		() => new Guild(client, payload.d),
		(g) => g._patch(payload.d),
	);

	if (payload.t === GatewayDispatchEvents.GuildCreate) {
		client.emit(payload.d.unavailable ? "guildCreate" : "guildAvailable", guild);
	} else {
		client.emit("guildUpdate", guild);
	}
}

registerHandler(GatewayDispatchEvents.GuildCreate, onCreateAndUpdate);
registerHandler(GatewayDispatchEvents.GuildUpdate, onCreateAndUpdate);

registerHandler(GatewayDispatchEvents.GuildDelete, async (client, payload) => {
	const guild = client.cache.guilds.get(payload.d.id);

	if (!guild) {
		return;
	}

	for (const channel of guild.channels.values()) {
		client.cache.channels.delete(channel.id);
	}

	client.cache.guilds.delete(payload.d.id);
	client.emit("guildDelete", guild);
});
