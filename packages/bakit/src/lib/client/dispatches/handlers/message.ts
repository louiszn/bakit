import {
	GatewayDispatchEvents,
	type GatewayMessageCreateDispatch,
	type GatewayMessageUpdateDispatch,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { Partial } from "../../Partial.js";
import { Message } from "@/lib/structures/index.js";

import type { Client } from "../../Client.js";

async function ensureMessageCache(
	client: Client,
	payload: GatewayMessageCreateDispatch | GatewayMessageUpdateDispatch,
) {
	let message: Message;

	if (client.cache.isModuleEnabled("messages")) {
		message = await client.cache.resolve(
			client.cache.messages,
			payload.d.id,
			() => new Message(client, payload.d),
			(m) => m._patch(payload.d),
		);
	} else {
		message = new Message(client, payload.d);
	}

	return message;
}

registerHandler(GatewayDispatchEvents.MessageCreate, async (client, payload) => {
	const message = await ensureMessageCache(client, payload);

	// Update latest message ID for the cached channel
	message.channel.data.last_message_id = message.id;

	if (message.channel.isThread()) {
		message.channel.data.message_count = (message.channel.data.message_count ?? 0) + 1;
		message.channel.data.total_message_sent = (message.channel.data.total_message_sent ?? 0) + 1;
	}

	if (message.partial && !client.options.partials.has(Partial.Message)) {
		return;
	}

	if (message.channel.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit("messageCreate", message);
});

registerHandler(GatewayDispatchEvents.MessageUpdate, async (client, payload) => {
	const message = await ensureMessageCache(client, payload);

	if (message.partial && !client.options.partials.has(Partial.Message)) {
		return;
	}

	if (message.channel.partial && !client.options.partials.has(Partial.Channel)) {
		return;
	}

	client.emit("messageUpdate", message);
});

registerHandler(GatewayDispatchEvents.MessageDelete, async (client, payload) => {
	let message: Message | undefined;

	if (client.cache.isModuleEnabled("messages")) {
		message = await client.cache.messages.get(payload.d.id);
	}

	if (!message) {
		message = new Message(client, payload.d as never);
	}

	if (message.channel.isThread()) {
		message.channel.data.message_count = Math.min((message.channel.data.message_count ?? 0) - 1, 0);
	}

	client.emit("messageDelete", message);
});
