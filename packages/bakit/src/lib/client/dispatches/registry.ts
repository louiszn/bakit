import type { GatewayDispatchEvents, GatewayDispatchPayload } from "discord-api-types/v10";

import type { Client } from "../Client.js";

type DispatchPayloadMap = {
	[P in GatewayDispatchPayload as P["t"]]: P;
};

export type ClientGatewayDispatchHandler<E extends GatewayDispatchEvents = GatewayDispatchEvents> = (
	client: Client,
	payload: DispatchPayloadMap[E],
) => void | Promise<void>;

export const handlers: Partial<{
	[E in GatewayDispatchEvents]: ClientGatewayDispatchHandler<E>;
}> = {};

export function registerHandler<E extends GatewayDispatchEvents>(event: E, handler: ClientGatewayDispatchHandler<E>) {
	if (handlers[event]) {
		throw new Error(`Handler for ${event} already registered`);
	}

	handlers[event] = handler as ClientGatewayDispatchHandler;
}
