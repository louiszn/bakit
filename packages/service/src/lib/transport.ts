import type { ValueOf, MergeExclusive } from "type-fest";

import { createIPCClient, createIPCServer, type IPCClientOptions, type IPCServerOptions } from "./driver/ipc.js";
import type { BaseTransportClientDriver, BaseTransportServerDriver, Serializable } from "@/types/driver.js";
import { Collection, type RejectFn, type ResolveFn } from "@bakit/utils";
import { randomUUID } from "node:crypto";

/**
 * Transport driver type identifiers.
 */
export const TransportDriver = {
	/**
	 * Uses Unix Domain Sockets / Named Pipes for communications between processes.
	 */
	IPC: "ipc",
} as const;
export type TransportDriver = ValueOf<typeof TransportDriver>;

export interface TransportClientDriverSpecificOptions {
	[TransportDriver.IPC]: IPCClientOptions;
}

export interface TransportServerDriverSpecificOptions {
	[TransportDriver.IPC]: IPCServerOptions;
}

export type TransportClientOptions = {
	[D in TransportDriver]: { driver: D } & TransportClientDriverSpecificOptions[D];
}[TransportDriver];

export type TransportServerOptions = {
	[D in TransportDriver]: { driver: D } & TransportServerDriverSpecificOptions[D];
}[TransportDriver];

export interface TransportClientMessageHandler {
	request<T>(id: string, ...args: Serializable[]): Promise<T>;
}

export interface RPCRequestMessage {
	type: "request";
	id: string;
	method: string;
	args: Serializable[];
}

export interface RPCError {
	code: string;
	message: string;
	data?: Serializable;
}

export type RPCResponseMessage = {
	type: "response";
	id: string;
} & MergeExclusive<{ result: Serializable }, { error: RPCError }>;

export function createTransportClient(options: TransportClientOptions) {
	let driver: BaseTransportClientDriver;

	switch (options.driver) {
		case TransportDriver.IPC: {
			driver = createIPCClient(options);
		}
	}

	const handler = createTransportClientMessageHandler(driver);

	return {
		...handler,
		send: driver.send,
	};
}

export function createTransportServer(options: TransportServerOptions) {
	let driver: BaseTransportServerDriver;

	switch (options.driver) {
		case TransportDriver.IPC: {
			driver = createIPCServer(options);
		}
	}

	return {
		broadcast: driver.broadcast,
	};
}

export function createTransportClientMessageHandler(driver: BaseTransportClientDriver): TransportClientMessageHandler {
	const requests = new Collection<
		string,
		{
			resolve: ResolveFn;
			reject: RejectFn;
		}
	>();

	driver.on("message", (message) => {
		if (!isResponseMessage(message)) {
			return;
		}

		const entry = requests.get(message.id);

		if (!entry) {
			return;
		}

		requests.delete(message.id);

		if (message.error !== undefined) {
			entry.reject(message.error);
		} else {
			entry.resolve(message.result);
		}
	});

	function isPlainObject(value: unknown): value is object {
		return Object.prototype.toString.call(value) === "[object Object]";
	}

	function isResponseMessage(message: Serializable): message is RPCResponseMessage {
		if (!isPlainObject(message)) {
			return false;
		}

		const hasType = "type" in message && message.type === "response";
		const hasId = "id" in message && typeof message.id === "string";
		const hasResult = "result" in message && message.result !== undefined;
		const hasError = "error" in message && message.error !== undefined;

		return hasType && hasId && hasResult !== hasError;
	}

	function request<T>(method: string, ...args: Serializable[]): Promise<T> {
		const requestId = randomUUID();

		driver.send({
			type: "request",
			id: requestId,
			method,
			args,
		} satisfies RPCRequestMessage);

		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				const request = requests.get(requestId);
				if (request) {
					request.reject(new Error("RPC timeout"));
					requests.delete(requestId);
				}
			}, 30_000);

			requests.set(requestId, {
				resolve: (v) => {
					clearTimeout(timeout);
					resolve(v as T);
				},
				reject: (e) => {
					clearTimeout(timeout);
					reject(e);
				},
			});
		});
	}

	return {
		request,
	};
}
