import { randomUUID } from "node:crypto";

import type { Driver, Serializable } from "./types/driver.js";
import type { ValueOf } from "type-fest";
import { createSocketClient, createSocketServer } from "./driver/socket.js";

export interface TransportServerOptions {
	id: string;
	driver: TransportDriver;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TransportRequestHandler = (...args: any[]) => void;

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

/**
 * Transport message type identifiers.
 */
export const TransportMessageType = {
	Request: "request",
	Response: "response",
} as const;
export type TransportMessageType = ValueOf<typeof TransportMessageType>;

/**
 * Create a transport server for communicate between services.
 * @param options - The options for initalizing transport server.
 * @returns The transport server interface.
 */
export function createTransportServer(options: TransportServerOptions) {
	let driver: Driver;

	switch (options.driver) {
		case TransportDriver.Socket:
			driver = createSocketServer(options.id);
			break;
		default:
			throw new Error("Invalid transport driver provided");
	}

	return createTransportHandler(driver);
}
export type TransportServer = ReturnType<typeof createTransportServer>;

/**
 * Create a transport connection to an existing server for communicating.
 * @param options - The options for initalizing transport client.
 * @returns The transport client interface.
 */
export function createTransportClient(options: TransportServerOptions) {
	let driver: Driver;

	switch (options.driver) {
		case TransportDriver.Socket:
			driver = createSocketClient(options.id);
			break;
		default:
			throw new Error("Invalid transport driver provided");
	}

	return createTransportHandler(driver);
}
export type TransportClient = ReturnType<typeof createTransportClient>;

/**
 * Create a handler interface for the transport.
 * @param driver - The driver for the transport interface.
 * @returns The transport handler interface.
 */
export function createTransportHandler(driver: Driver) {
	const pendingRequests = new Map<
		string,
		{
			resolve: (value?: unknown) => void;
			reject: (error: unknown) => void;
		}
	>();

	driver.on("message", (message) => {
		if (!message.id) {
			return;
		}

		const index = message.id.indexOf(":");
		if (index === -1) {
			return;
		}

		const messageType = message.id.slice(0, index);
		const id = message.id.slice(index + 1);

		switch (messageType) {
			case TransportMessageType.Request:
				driver.emit(`request:${message.type}`, id, message.data);
				break;
			case TransportMessageType.Response:
				handlePendingRequest(id, [message.data, message.error]);
				break;
		}
	});

	function handlePendingRequest(id: string, result: [unknown, string]) {
		const request = pendingRequests.get(id);
		if (!request) {
			return;
		}

		pendingRequests.delete(id);

		const { resolve, reject } = request;
		const [data, error] = result;

		if (error) {
			reject(new Error(error));
		} else {
			resolve(data);
		}
	}

	function request<T>(type: string, data: Serializable, timeout = 30_000) {
		return new Promise<T>((resolve, reject) => {
			const id = randomUUID();

			const timer = setTimeout(() => {
				pendingRequests.delete(id);
				reject(new Error("Transport request timeout"));
			}, timeout);

			pendingRequests.set(id, {
				resolve(value) {
					clearTimeout(timer);
					resolve(value as T);
				},
				reject(error) {
					clearTimeout(timer);
					reject(error);
				},
			});

			driver.send({
				id: `${TransportMessageType.Request}:${id}`,
				type,
				data: data ?? {},
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function register(type: string, handler: (response: TransportResponse, data: any) => void) {
		driver.on(`${TransportMessageType.Request}:${type}`, (id: string, data) => {
			const response = createTransportResponse(driver, id);
			handler(response, data);
		});
	}

	return {
		driver,
		request,
		register,
		send: driver.send,
	};
}
export type TransportHandler = ReturnType<typeof createTransportHandler>;

/**
 * Create a response interface for the incomming request.
 * @param driver - The driver of the transport interface.
 * @param id - The id of the incomming request.
 * @returns The response interface.
 */
export function createTransportResponse(driver: Driver, id: string) {
	const baseResponse = {
		id: `${TransportMessageType.Response}:${id}`,
	};

	function success(data: Serializable) {
		driver.send({ ...baseResponse, data });
	}

	function error(err: unknown) {
		let message;

		if (typeof err === "string") {
			message = err;
		} else if (err instanceof Error) {
			message = err.message;
		} else {
			message = "Unknown error";
		}

		driver.send({ ...baseResponse, error: message });
	}

	return {
		id,
		success,
		error,
	};
}
export type TransportResponse = ReturnType<typeof createTransportResponse>;
