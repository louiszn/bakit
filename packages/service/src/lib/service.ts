import { type Awaitable, Collection, type FunctionLike, type Promisify } from "@bakit/utils";
import {
	createTransportClient,
	createTransportServer,
	type TransportClient,
	type TransportClientOptions,
	type TransportServer,
	type TransportServerOptions,
} from "./transport.js";
import type { ValueOf } from "type-fest";

export interface ServiceOptions {
	name: string;
	transport: TransportClientOptions & TransportServerOptions;
}

export interface Service {
	readonly name: string;
	readonly role: ServiceRole;
	define<F extends ServiceFunction>(method: string, handler: F): Promisify<F>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceFunction = FunctionLike<any[], Awaitable<any>>;

export const ServiceRole = {
	Client: "client",
	Server: "server",
} as const;
export type ServiceRole = ValueOf<typeof ServiceRole>;

export interface ServiceClientRuntime {
	role: typeof ServiceRole.Client;
	transport: TransportClient;
}

export interface ServiceServerRuntime {
	role: typeof ServiceRole.Server;
	transport: TransportServer;
}

export type ServiceRuntime = ServiceClientRuntime | ServiceServerRuntime;

export interface MutableRuntime {
	role: ServiceRole | "unknown";
	transport?: TransportClient | TransportServer;
}

export interface ServiceInteral {
	runtime: ServiceRuntime;
	bind(role: "client" | "server"): void;
}

const SERVICE_INTERNAL = Symbol("service-internal");

export function createService(options: ServiceOptions): Service {
	const handlers = new Collection<string, ServiceFunction>();

	const runtime: MutableRuntime = { role: "unknown" };

	const service: Service = {
		get name() {
			return options.name;
		},
		get role() {
			if (runtime.role === "unknown") {
				throw new Error(`Service "${options.name}" is not bound`);
			}

			return runtime.role;
		},
		define,
	};

	function define<F extends ServiceFunction>(method: string, handler: F): Promisify<F> {
		if (handlers.has(method)) {
			throw new Error(`Service method "${method}" already defined`);
		}

		handlers.set(method, handler);

		const fn = (async (...args: Parameters<F>) => {
			ensureClientBound();

			if (runtime.role === "unknown") {
				throw new Error(`Service "${options.name}" is not bound (method "${method}")`);
			}

			if (runtime.role === "server") {
				return handler(...args);
			}

			assertClient(runtime);
			return runtime.transport.request(method, ...args);
		}) as Promisify<F>;

		return fn;
	}

	function ensureClientBound() {
		if (runtime.role !== "unknown" || process.env["BAKIT_SERVICE_NAME"] === options.name) {
			return;
		}

		bind(ServiceRole.Client);
	}

	function assertClient(runtime: MutableRuntime): asserts runtime is ServiceClientRuntime {
		if (runtime.role !== "client") {
			throw new Error(`Service "${options.name}" is not a client`);
		}
	}

	function bind(role: "client" | "server") {
		if (runtime.role !== "unknown") {
			throw new Error(`Service "${options.name}" already bound`);
		}

		if (role === "server") {
			const server = createTransportServer(options.transport);

			for (const [method, handler] of handlers) {
				server.handle(method, handler);
			}

			runtime.role = "server";
			runtime.transport = server;

			server.listen();
		} else if (role === "client") {
			const client = createTransportClient(options.transport);

			runtime.role = "client";
			runtime.transport = client;

			client.connect();
		}
	}

	Object.defineProperty(service, SERVICE_INTERNAL, {
		value: {
			get runtime() {
				if (runtime.role === "unknown") {
					throw new Error(`Service "${options.name}" is not bound`);
				}

				return runtime as ServiceRuntime;
			},
			bind,
		} satisfies ServiceInteral,
	});

	return service;
}

export function getInternalService(service: Service): ServiceInteral {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (service as any)[SERVICE_INTERNAL];
}
