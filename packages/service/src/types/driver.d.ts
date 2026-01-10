import type { EventBus } from "@bakit/utils";

export type Serializable = string | number | bigint | boolean | object;

export interface BaseTransportClientDriver extends EventBus<BaseTransportClientDriverEvents> {
	send(message: Serializable): void;
}

export interface BaseTransportServerDriver extends EventBus {
	broadcast(message: Serializable): void;
}

export interface BaseTransportClientDriverEvents {
	message: [message: Serializable];
	connect: [];
	disconnected: [];
	error: [error: Error];
}
