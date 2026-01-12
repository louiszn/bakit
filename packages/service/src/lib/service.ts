import { type Awaitable, type FunctionLike, type Promisify, promisify } from "@bakit/utils";
import {
	createTransportClient,
	createTransportServer,
	type TransportClientOptions,
	type TransportServerOptions,
} from "./transport.js";
import type { Serializable } from "@/types/driver.js";

export interface ServiceOptions {
	name: string;
	transport: TransportClientOptions & TransportServerOptions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceFunction = FunctionLike<any[], Awaitable<any>>;

export interface Service {
	define<F extends ServiceFunction>(method: string, handler: F): Promisify<F>;
}

export function createService(options: ServiceOptions): Service {
	const isServer = process.env["BAKIT_SERVICE_NAME"] === options.name;

	return isServer ? createServiceServer(options) : createServiceClient(options);
}

export function createServiceClient(options: ServiceOptions): Service {
	const transport = createTransportClient(options.transport);

	function define<F extends ServiceFunction>(method: string, _handler: F): Promisify<F> {
		const fn = (...args: Serializable[]) => transport.request(method, ...args);
		return fn as Promisify<F>;
	}

	return {
		define,
	};
}

export function createServiceServer(options: ServiceOptions): Service {
	const transport = createTransportServer(options.transport);

	function define<F extends ServiceFunction>(method: string, handler: F): Promisify<F> {
		transport.handle(method, handler);
		return promisify(handler);
	}

	return {
		define,
	};
}
