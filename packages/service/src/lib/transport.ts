import { randomUUID } from "node:crypto";

import {
	attachEventBus,
	Collection,
	isPlainObject,
	type Awaitable,
	type EventBus,
	type RejectFn,
	type ResolveFn,
} from "@bakit/utils";
import { createIPCClient, createIPCServer, type IPCClientOptions, type IPCServerOptions } from "./driver/ipc.js";

import { deserializeRPCError, serializeRPCError, type RPCErrorPayload } from "@/errors/RPCError.js";

import type { ValueOf, MergeExclusive } from "type-fest";
import type { BaseClientDriver, BaseServerDriver, Serializable } from "@/types/driver.js";

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

export interface TransportClient extends TransportClientProtocol, EventBus<TransportEvents> {
	send: BaseServerDriver["send"];
	connect: BaseClientDriver["connect"];
	disconnect: BaseClientDriver["disconnect"];
}

export interface TransportServer extends TransportServerProtocol, EventBus<TransportEvents> {
	broadcast: BaseServerDriver["broadcast"];
	listen: BaseServerDriver["listen"];
}

export interface TransportClientProtocol {
	request<T>(method: string, ...args: Serializable[]): Promise<T>;
}

export type RPCHandler<Args extends Serializable[], Result extends Serializable> = (...args: Args) => Awaitable<Result>;

export interface TransportServerProtocol {
	handle<Args extends Serializable[], Result extends Serializable>(
		method: string,
		handler: RPCHandler<Args, Result>,
	): void;
}

export interface RPCRequestMessage {
	type: "request";
	id: string;
	method: string;
	args: Serializable[];
}

export type RPCResponseMessage = {
	type: "response";
	id: string;
} & MergeExclusive<{ result: Serializable }, { error: RPCErrorPayload }>;

export interface TransportEvents {
	connect: [];
	disconnect: [];
	error: [error: Error];

	// RPC-level
	request: [id: string, method: string];
	response: [id: string];
	timeout: [id: string];

	// Server-side
	clientConnect: [connection: unknown];
	clientDisconnect: [connection: unknown];
}

export function createTransportClient(options: TransportClientOptions): TransportClient {
	let driver: BaseClientDriver;

	switch (options.driver) {
		case TransportDriver.IPC: {
			driver = createIPCClient(options);
		}
	}

	const protocol = createTransportClientProtocol(driver);

	const base = {
		...protocol,
		send: driver.send,
		connect: driver.connect,
		disconnect: driver.disconnect,
	};

	const self = attachEventBus<TransportEvents, typeof base>(base);

	driver.on("connect", () => self.emit("connect"));
	driver.on("disconnect", () => self.emit("disconnect"));
	driver.on("error", (error) => self.emit("error", error));

	return self;
}

export function createTransportServer(options: TransportServerOptions): TransportServer {
	let driver: BaseServerDriver;

	switch (options.driver) {
		case TransportDriver.IPC: {
			driver = createIPCServer(options);
		}
	}

	const protocol = createTransportServerProtocol(driver);

	const base = {
		...protocol,
		broadcast: driver.broadcast,
		listen: driver.listen,
	};

	const self = attachEventBus<TransportEvents, typeof base>(base);

	driver.on("clientConnect", (conn) => self.emit("clientConnect", conn));
	driver.on("clientDisconnect", (conn) => self.emit("clientDisconnect", conn));
	driver.on("clientError", (_, error) => self.emit("error", error));

	return self;
}

export function createTransportClientProtocol(driver: BaseClientDriver): TransportClientProtocol {
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
			entry.reject(deserializeRPCError(message.error));
		} else {
			entry.resolve(message.result);
		}
	});

	function isResponseMessage(message: unknown): message is RPCResponseMessage {
		if (!isPlainObject(message)) {
			return false;
		}

		const hasType = "type" in message && message["type"] === "response";
		const hasId = "id" in message && typeof message["id"] === "string";
		const hasResult = "result" in message && message["result"] !== undefined;
		const hasError = "error" in message && message["error"] !== undefined;

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

export function createTransportServerProtocol(driver: BaseServerDriver): TransportServerProtocol {
	const handlers = new Collection<string, RPCHandler<Serializable[], Serializable>>();

	driver.on("message", async (connection, message) => {
		if (!isRequestMessage(message)) {
			return;
		}

		const handler = handlers.get(message.method);

		const sendError = (error: Error | RPCErrorPayload) => {
			const err = error instanceof Error ? serializeRPCError(error) : error;

			const payload: RPCResponseMessage = {
				type: "response",
				id: message.id,
				error: err,
			};

			driver.send(connection, payload as unknown as Serializable);
		};

		const sendResult = (result: Serializable) => {
			driver.send(connection, {
				type: "response",
				id: message.id,
				result,
			} satisfies RPCResponseMessage);
		};

		if (!handler) {
			sendError({ message: `Unknown method: ${message.method}` });
			return;
		}

		try {
			const result = await handler(...message.args);
			sendResult(result);
		} catch (error) {
			sendError(error as Error);
		}
	});

	function isRequestMessage(message: unknown): message is RPCRequestMessage {
		if (!isPlainObject(message)) {
			return false;
		}

		const hasType = "type" in message && message["type"] === "request";
		const hasId = "id" in message && typeof message["id"] === "string";
		const hasMethod = "method" in message && typeof message["method"] === "string";
		const hasArgs = "args" in message && Array.isArray(message["args"]);

		return hasType && hasId && hasMethod && hasArgs;
	}

	function handle<Args extends Serializable[], Result extends Serializable>(
		method: string,
		handler: RPCHandler<Args, Result>,
	) {
		const wrapped: RPCHandler<Serializable[], Serializable> = (...args) => {
			return handler(...(args as Args));
		};

		handlers.set(method, wrapped);
	}

	return {
		handle,
	};
}
