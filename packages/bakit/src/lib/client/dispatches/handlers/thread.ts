import {
	GatewayDispatchEvents,
	type APIThreadChannel,
	type GatewayChannelCreateDispatchData,
	type GatewayChannelUpdateDispatchData,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { ClientChannelManager } from "@/lib/managers/client/ClientChannelManager.js";
import { Partial } from "../../Partial.js";

import type { Client } from "../../Client.js";
import type { ThreadBasedChannel } from "@/lib/structures/index.js";

function resolveThread(
	client: Client,
	payload: GatewayChannelCreateDispatchData | GatewayChannelUpdateDispatchData | APIThreadChannel,
) {
	let thread = client.cache.channels.get(payload.id) as ThreadBasedChannel | undefined;

	if (!thread?.isThread()) {
		thread = ClientChannelManager.create(client, payload) as ThreadBasedChannel;

		client.cache.channels.set(payload.id, thread);
		thread.guild.channels.set(payload.id, thread);
	} else {
		thread._patch(payload);
	}

	if ("member" in payload) {
		// TODO: store members
	}

	return thread as ThreadBasedChannel;
}

registerHandler(GatewayDispatchEvents.ThreadCreate, (client, payload) => {
	const thread = resolveThread(client, payload.d);

	if (thread.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit("threadCreate", thread);
});

registerHandler(GatewayDispatchEvents.ThreadUpdate, (client, payload) => {
	const thread = resolveThread(client, payload.d);

	if (thread.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit("threadUpdate", thread);
});

registerHandler(GatewayDispatchEvents.ThreadDelete, (client, payload) => {
	let thread = client.cache.channels.get(payload.d.id);

	if (thread) {
		client.cache.channels.delete(payload.d.id);
	} else {
		thread = ClientChannelManager.create(client, {
			id: payload.d.id,
			guild_id: payload.d.guild_id,
			parent_id: payload.d.parent_id,
			type: payload.d.type,
		});
	}

	if (!thread.isThread()) {
		return;
	}

	if (thread.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit("threadDelete", thread);
});

registerHandler(GatewayDispatchEvents.ThreadListSync, (client, payload) => {
	for (const thread of payload.d.threads) {
		resolveThread(client, thread);
	}
});
