import EventEmitter from "node:events";

import type { Serializable } from "@/types/index.js";
import type { Awaitable } from "@bakit/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap<T> = Record<keyof T, any[]> | DefaultEventMap;
type DefaultEventMap = [never];

export interface BaseClientDriverEvents {
	message: [message: Serializable];
	connect: [];
	disconnect: [];
	error: [error: Error];
}

export interface BaseServerDriverEvents<Connection = unknown> {
	listen: [];
	close: [];
	error: [error: Error];
	message: [connection: Connection, message: Serializable];
	connectionAdd: [connection: Connection];
	connectionRemove: [connection: Connection];
	connectionError: [connection: Connection, error: Error];
}

abstract class BaseDriver<Options extends object, Events extends EventMap<Events>> extends EventEmitter<Events> {
	public constructor(public options: Options) {
		super();
	}
}

export abstract class BaseClientDriver<
	Options extends object = object,
	Events extends EventMap<Events> & BaseClientDriverEvents = BaseClientDriverEvents,
> extends BaseDriver<Options, Events> {
	public constructor(options: Options) {
		super(options);
	}

	abstract readonly ready: boolean;

	abstract send(message: Serializable): Awaitable<void>;
	abstract connect(): Awaitable<void>;
	abstract disconnect(): Awaitable<void>;
}

export abstract class BaseServerDriver<
	Options extends object = object,
	Connection = unknown,
	Events extends EventMap<Events> & BaseServerDriverEvents<Connection> = BaseServerDriverEvents<Connection>,
> extends BaseDriver<Options, Events> {
	public constructor(options: Options) {
		super(options);
	}

	declare readonly _connectionType: Connection;

	abstract readonly connections: Set<Connection> | Map<unknown, Connection> | Connection[];

	abstract listen(): Awaitable<void>;
	abstract close(): Awaitable<void>;
	abstract send(connection: Connection, message: Serializable): Awaitable<void>;
	abstract broadcast(message: Serializable): Awaitable<unknown>;
}
