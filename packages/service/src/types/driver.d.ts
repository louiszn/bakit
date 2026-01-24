import type { EventBus } from "@bakit/utils";

export type Serializable =
	| null
	| undefined
	| string
	| number
	| boolean
	| bigint
	| Date
	| Buffer
	| Uint8Array
	| Serializable[]
	| { [key: string | number]: Serializable }
	| Map<string | number, Serializable>
	| Set<Serializable>
	| void;

export interface BaseClientDriver extends EventBus<BaseClientDriverEvents> {
	send(message: Serializable): void;
	connect(): void;
	disconnect(): void;
	readonly ready: boolean;
}

export interface BaseServerDriver extends EventBus<BaseServerDriverEvents> {
	broadcast(message: Serializable): void;
	send(connection: unknown, message: Serializable): void;
	listen(): void;
	close(): void;
}

export interface BaseClientDriverEvents {
	message: [message: Serializable];
	connect: [];
	disconnect: [];
	error: [error: Error];
}

export interface BaseServerDriverEvents {
	listen: [];
	close: [];
	message: [connection: unknown, message: Serializable];
	clientConnect: [connection: unknown];
	clientDisconnect: [connection: unknown];
	clientError: [connection: unknown, error: Error];
}
