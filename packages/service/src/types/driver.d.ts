import type { EventEmitter } from "@bakit/utils";

export type Serializable = string | number | bigint | boolean | object;

export interface DriverEvents {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: `request:${string}`]: any[];

	ready: [];
	open: [socket: unknown];
	close: [socket: unknown];
	disconnect: [socket: unknown];
	error: [error: unknown, socket: unknown];
	message: [message: Serializable];
}

export interface Driver extends EventEmitter<DriverEvents> {
	send: (message: Serializable) => void;
	start: () => void;
}
