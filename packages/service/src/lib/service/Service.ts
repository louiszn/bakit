import { normalize, relative, resolve, sep } from "node:path";
import { glob, type FunctionLike, type Promisify } from "@bakit/utils";

import {
	BaseClientDriver,
	BaseServerDriver,
	createIPCClient,
	createIPCServer,
	type IPCClientOptions,
	type IPCServerOptions,
} from "../drivers/index.js";
import { createTransportServer, type TransportServer } from "../transport/TransportServer.js";
import { createTransportClient, type TransportClient } from "../transport/TransportClient.js";

export enum ServiceDriver {
	IPC = "ipc",
}

interface DriverOptionsMap {
	[ServiceDriver.IPC]: {
		id: string;
		server?: Omit<IPCServerOptions, "id">;
		client?: Omit<IPCClientOptions, "id">;
	};
}

export type ServiceOptions = {
	[D in keyof DriverOptionsMap]: { driver: D } & DriverOptionsMap[D];
}[keyof DriverOptionsMap];

export interface ServiceClientRuntime {
	role: "client";
	transport: TransportClient<BaseClientDriver>;
}

export interface ServiceServerRuntime {
	role: "server";
	transport: TransportServer<BaseServerDriver>;
}

export class Service {
	private runtime?: ServiceServerRuntime | ServiceClientRuntime;
	private handlers = new Map<string, FunctionLike>();

	private binding?: Promise<void>;

	public constructor(public readonly options: ServiceOptions) {}

	public get role() {
		if (!this.runtime) {
			throw new Error("Service is not bound");
		}

		return this.runtime.role;
	}

	public define<F extends FunctionLike>(method: string, handler: F): Promisify<F> {
		if (this.handlers.has(method)) {
			throw new Error(`Service method "${method}" already defined`);
		}

		this.handlers.set(method, handler);

		const fn = (async (...args: Parameters<F>) => {
			await this.ensureClientBound();

			if (!this.runtime) {
				throw new Error(`Service is not bound (method "${method}")`);
			}

			if (this.runtime.role === "server") {
				return handler(...args);
			}

			return this.runtime.transport.request(method, ...args);
		}) as Promisify<F>;

		return fn;
	}

	protected ensureServerBound() {
		if (this.runtime) {
			return;
		}

		if (this.binding) {
			return this.binding;
		}

		this.binding = (async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let transport: TransportServer<BaseServerDriver<any>>;

			switch (this.options.driver) {
				case ServiceDriver.IPC: {
					const driver = createIPCServer({
						id: this.options.id,
						...this.options.server,
					});

					transport = createTransportServer(driver);
					break;
				}
			}

			this.runtime = {
				role: "server",
				transport,
			};

			for (const [name, handler] of this.handlers) {
				transport.handle(name, handler);
			}

			await new Promise<void>((resolve, reject) => {
				const onResolve = () => {
					cleanup();
					resolve();
				};

				const onReject = (err: Error) => {
					cleanup();
					reject(err);
				};

				const cleanup = () => {
					transport.off("listen", onResolve);
					transport.off("error", onReject);
				};

				transport.once("listen", onResolve);
				transport.once("error", onReject);

				transport.listen();
			});

			this.binding = undefined;
		})();

		return this.binding;
	}

	protected ensureClientBound() {
		if (this.runtime) {
			return;
		}

		if (this.binding) {
			return this.binding;
		}

		this.binding = (async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let transport: TransportClient<BaseClientDriver<object, any>>;

			switch (this.options.driver) {
				case ServiceDriver.IPC: {
					const driver = createIPCClient({
						id: this.options.id,
						...this.options.client,
					});

					transport = createTransportClient(driver);
					break;
				}
			}

			this.runtime = {
				role: "client",
				transport,
			};

			await new Promise<void>((resolve, reject) => {
				const onResolve = () => {
					cleanup();
					resolve();
				};

				const onReject = (err: Error) => {
					cleanup();
					reject(err);
				};

				const cleanup = () => {
					transport.off("connect", onResolve);
					transport.off("error", onReject);
				};

				transport.once("connect", onResolve);
				transport.once("error", onReject);

				transport.connect();
			});

			this.binding = undefined;
		})();

		return this.binding;
	}
}

export async function createService(options: ServiceOptions) {
	const service = new Service(options);
	return service;
}

export async function getServices(entryDir = "./services", cwd = process.cwd()) {
	const path = resolve(entryDir, "**", "*.service.{ts,js}");
	return await glob(path, { cwd });
}

export function getServiceName(servicePath: string, cwd = process.cwd()) {
	let rel = relative(cwd, servicePath);

	rel = normalize(rel);
	rel = rel.replace(/^services[\\/]/, "");
	rel = rel.replace(/\.service\.(ts|js)$/, "");

	return rel.split(sep).join("/");
}
