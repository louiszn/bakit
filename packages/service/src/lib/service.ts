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

	initialize?: FunctionLike<[], Awaitable<void>>;
	onReady?: FunctionLike<[], Awaitable<void>>;

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

			assertRuntimeClient(service, runtime);

			return runtime.transport.request(method, ...args);
		}) as Promisify<F>;

		return fn;
	}

	function ensureClientBound() {
		if (runtime.role !== "unknown" || process.env["BAKIT_SERVICE_NAME"] === options.name) {
			return;
		}

		bind(ServiceRole.Client);
		assertRuntimeClient(service, runtime);

		// The role check will make sure this is only called once
		// The service will be connected automatically when the `definition` is called
		if (!runtime.transport.ready) {
			runtime.transport.connect();
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
		} else if (role === "client") {
			const client = createTransportClient(options.transport);

			runtime.role = "client";
			runtime.transport = client;
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

export async function startServiceServer(service: Service) {
	const internal = getInternalService(service);

	internal.bind(ServiceRole.Server);
	await service.initialize?.();

	return await new Promise<void>((resolve) => {
		assertRuntimeServer(service, internal.runtime);

		internal.runtime.transport.once("listen", async () => {
			resolve();
			await service.onReady?.();
		});

		internal.runtime.transport.listen();
	});
}

export function assertRuntimeClient(
	service: Service,
	runtime: MutableRuntime,
): asserts runtime is ServiceClientRuntime {
	if (runtime.role !== "client") {
		throw new Error(`Service "${service.name}" is not a client`);
	}
}

export function assertRuntimeServer(
	service: Service,
	runtime: MutableRuntime,
): asserts runtime is ServiceServerRuntime {
	if (runtime.role !== "server") {
		throw new Error(`Service "${service.name}" is not a server`);
	}
}

export function getInternalService(service: Service): ServiceInteral {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (service as any)[SERVICE_INTERNAL];
}
