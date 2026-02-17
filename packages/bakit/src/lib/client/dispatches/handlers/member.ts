import { GatewayDispatchEvents } from "discord-api-types/v10";
import { registerHandler } from "../registry.js";
import { Typing } from "@/lib/structures/Typing.js";

registerHandler(GatewayDispatchEvents.TypingStart, async (client, payload) => {
	// TODO: add cache module for member

	const typing = new Typing(client, payload.d);

	client.emit("typingStart", typing);
});
