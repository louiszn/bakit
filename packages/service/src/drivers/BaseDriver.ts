import EventEmitter from "node:events";

export type Serializable = string | number | boolean | null | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventMap<T> = Record<keyof T, any[]> | DefaultEventMap;
type DefaultEventMap = [never];

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

	abstract connect(): Promise<void>;
}

export abstract class BaseServerDriver<
	Options extends object = object,
	Events extends EventMap<Events> & BaseServerDriverEvents = BaseServerDriverEvents,
> extends BaseDriver<Options, Events> {
	public constructor(options: Options) {
		super(options);
	}

	abstract listen(): Promise<void>;
}
