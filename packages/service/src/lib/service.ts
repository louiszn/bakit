import { type Awaitable, type FunctionLike, type Promisify, promisify } from "@bakit/utils";
import {
	createTransportClient,
	createTransportServer,
	type TransportClient,
	type TransportClientOptions,
	type TransportServer,
	type TransportServerOptions,
} from "./transport.js";
import type { Serializable } from "@/types/driver.js";

export interface ServiceOptions {
	name: string;
	transport: TransportClientOptions & TransportServerOptions;
}

export interface ServiceServer {
	define<F extends ServiceFunction>(method: string, handler: F): Promisify<F>;
	transport: TransportServer;
}

export interface ServiceClient {
	define<F extends ServiceFunction>(method: string, handler: F): Promisify<F>;
	transport: TransportClient;
}

export interface Service {
	define<F extends ServiceFunction>(method: string, handler: F): Promisify<F>;
	start(): void;
	stop(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceFunction = FunctionLike<any[], Awaitable<any>>;

export function createService(options: ServiceOptions): Service {
	const isServer = process.env["BAKIT_SERVICE_NAME"] === options.name;

	if (isServer) {
		const server = createServiceServer(options);

		return {
			define: server.define,
			start: server.transport.listen,
			stop: server.transport.close,
		};
	} else {
		const client = createServiceClient(options);

		return {
			define: client.define,
			start: client.transport.connect,
			stop: client.transport.disconnect,
		};
	}
}

/**
 * Create a service client instance.
 *
 * @param {options} options.
 * @return {ServiceClient} Service client instance.
 */
export function createServiceClient(options: ServiceOptions): ServiceClient {
	const transport = createTransportClient(options.transport);

	function define<F extends ServiceFunction>(method: string, _handler: F): Promisify<F> {
		const fn = (...args: Serializable[]) => transport.request(method, ...args);
		return fn as Promisify<F>;
	}

	return {
		define,
		transport,
	};
}

export function createServiceServer(options: ServiceOptions): ServiceServer {
	const transport = createTransportServer(options.transport);

	function define<F extends ServiceFunction>(method: string, handler: F): Promisify<F> {
		transport.handle(method, handler);
		return promisify(handler);
	}

	return {
		define,
		transport,
	};
}
