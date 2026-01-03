import type { ValueOf } from "type-fest";

import { type IPCClientOptions, type IPCServerOptions } from "./driver/ipc.js";

/**
 * Transport driver type identifiers.
 */
export const TransportDriver = {
	/**
	 * Uses Unix Domain Sockets / Named Pipes for communications between processes.
	 */
	Socket: "socket",
} as const;
export type TransportDriver = ValueOf<typeof TransportDriver>;

export interface TransportDriverSpecificOptions {
	[TransportDriver.Socket]: {
		id: string;
		server?: IPCServerOptions;
		client?: IPCClientOptions;
	};
}

export type TransportOptions = {
	[D in TransportDriver]: {
		driver: D;
	} & TransportDriverSpecificOptions[D];
}[TransportDriver];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransportRequestHandler = (...args: any[]) => void;

/**
 * Transport message type identifiers.
 */
export const TransportMessageType = {
	Request: "request",
	Response: "response",
} as const;
export type TransportMessageType = ValueOf<typeof TransportMessageType>;
