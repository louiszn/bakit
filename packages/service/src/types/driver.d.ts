import type { EventBus } from "@bakit/utils";

export type Serializable = string | number | bigint | boolean | object | null;

export interface BaseClientDriver extends EventBus<BaseClientDriverEvents> {
	send(message: Serializable): void;
	connect(): void;
	disconnect(): void;
}

export interface BaseServerDriver extends EventBus<BaseServerDriverEvents> {
	broadcast(message: Serializable): void;
	send(connection: unknown, message: Serializable): void;
	listen(): void;
}

export interface BaseClientDriverEvents {
	message: [message: Serializable];
	connect: [];
	disconnected: [];
	error: [error: Error];
}

export interface BaseServerDriverEvents {
	message: [connection: unknown, message: Serializable];
	clientConnect: [connection: unknown];
	clientDisconnect: [connection: unknown];
	clientError: [connection: unknown, error: Error];
}
