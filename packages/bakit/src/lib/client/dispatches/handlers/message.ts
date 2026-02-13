import {
	GatewayDispatchEvents,
	type GatewayMessageCreateDispatch,
	type GatewayMessageUpdateDispatch,
} from "discord-api-types/v10";

import { registerHandler } from "../registry.js";
import { Partial } from "../../Partial.js";
import { Message } from "@/lib/structures/index.js";

import type { Client } from "../../Client.js";

async function onCreateAndUpdate(client: Client, payload: GatewayMessageCreateDispatch | GatewayMessageUpdateDispatch) {
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

	if (message.partial && !client.options.partials.has(Partial.Message)) {
		return;
	}

	client.emit(payload.t === GatewayDispatchEvents.MessageUpdate ? "messageUpdate" : "messageCreate", message);
}

registerHandler(GatewayDispatchEvents.MessageCreate, onCreateAndUpdate);
registerHandler(GatewayDispatchEvents.MessageUpdate, onCreateAndUpdate);

registerHandler(GatewayDispatchEvents.MessageDelete, async (client, payload) => {
	let message: Message | undefined;

	if (client.cache.isModuleEnabled("messages")) {
		message = await client.cache.messages.get(payload.d.id);
	}

	if (!message) {
		message = new Message(client, payload.d as never);
	}

	client.emit("messageDelete", message);
});
