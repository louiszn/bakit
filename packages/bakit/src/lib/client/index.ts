import type { REST } from "@bakit/rest";
import { attachEventBus, type EventBus } from "@bakit/utils";

import { GatewayDispatchEvents, type GatewayReceivePayload } from "discord-api-types/v10";

import { createMessage, type Message } from "../structures/message.js";
import { createHelpers } from "./helpers/index.js";

export interface Client extends EventBus<ClientEvents> {
	rest: REST;
	helpers: ReturnType<typeof createHelpers>;
}

export interface ClientEvents {
	raw: [payload: GatewayReceivePayload];
	messageCreate: [message: Message];
}

export function createClient(rest: REST): Client {
	const base = {
		rest,
		helpers: undefined as never,
	};

	const self = attachEventBus<ClientEvents, typeof base>(base);
	Object.assign(self, createHelpers(self));

	self.on("raw", (payload) => {
		switch (payload.t) {
			case GatewayDispatchEvents.MessageCreate:
				self.emit("messageCreate", createMessage(self, payload.d));
				return;
		}
	});

	return self;
}
