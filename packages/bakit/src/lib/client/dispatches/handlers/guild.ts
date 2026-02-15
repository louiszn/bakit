import { GatewayDispatchEvents } from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { Guild } from "@/lib/structures/index.js";

registerHandler(GatewayDispatchEvents.GuildCreate, (client, payload) => {
	const guild = client.cache.resolveLocal(
		client.cache.guilds,
		payload.d.id,
		() => new Guild(client, payload.d),
		(g) => g._patch(payload.d),
	);

	for (const data of payload.d.channels) {
		client.channels.resolve(data);
	}

	for (const thread of payload.d.threads) {
		client.channels.resolve(thread);
	}

	client.emit(payload.d.unavailable ? "guildCreate" : "guildAvailable", guild);
});

registerHandler(GatewayDispatchEvents.GuildUpdate, (client, payload) => {
	const guild = client.cache.resolveLocal(
		client.cache.guilds,
		payload.d.id,
		() => new Guild(client, payload.d),
		(g) => g._patch(payload.d),
	);

	client.emit("guildUpdate", guild);
});

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
