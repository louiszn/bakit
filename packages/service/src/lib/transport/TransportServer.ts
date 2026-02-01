import EventEmitter from "node:events";

import { isPlainObject } from "@bakit/utils";

import { serializeRPCError } from "@/utils/rpcError.js";

import type { BaseServerDriver } from "../drivers/BaseDriver.js";
import type { RPCRequest, RPCResponse, Serializable } from "@/types/message.js";

export type RPCHandler = (...args: Serializable[]) => Promise<Serializable | Error>;

export interface TransportServerEvents<D extends BaseServerDriver> {
	listen: [];
	close: [];
	error: [error: Error];
	connectionAdd: [connection: D["_connectionType"]];
	connectionRemove: [connection: D["_connectionType"]];
	connectionError: [connection: D["_connectionType"], error: Error];
	message: [connection: D["_connectionType"], message: Serializable];
}

export class TransportServer<D extends BaseServerDriver> extends EventEmitter<TransportServerEvents<D>> {
	private handlers = new Map<string, RPCHandler>();

	public constructor(public readonly driver: D) {
		super();

		this.setupDriverListeners();
	}

	get connections() {
		return this.driver.connections as D["connections"];
	}

	public handle(method: string, handler: RPCHandler): void {
		if (this.handlers.has(method)) {
			throw new Error(`Method ${method} is already registered`);
		}

		this.handlers.set(method, handler);
	}

	public listen() {
		return this.driver.listen() as ReturnType<D["listen"]>;
	}

	public close() {
		return this.driver.close() as ReturnType<D["close"]>;
	}

	public broadcast(message: Serializable) {
		return this.driver.broadcast(message) as ReturnType<D["broadcast"]>;
	}

	private setupDriverListeners(): void {
		this.driver.on("listen", () => this.emit("listen"));
		this.driver.on("close", () => this.emit("close"));
		this.driver.on("error", (err) => this.emit("error", err));
		this.driver.on("connectionAdd", (conn) => this.emit("connectionAdd", conn));
		this.driver.on("connectionRemove", (conn) => this.emit("connectionRemove", conn));
		this.driver.on("connectionError", (conn, err) => this.emit("connectionError", conn, err));
		this.driver.on("message", (conn, msg) => this.handleMessage(conn, msg));
	}

	private async handleMessage(connection: unknown, message: Serializable): Promise<void> {
		this.emit("message", connection, message);

		if (!this.isRequestMessage(message)) {
			return;
		}

		const handler = this.handlers.get(message.method);

		const sendResponse = (result: Serializable, error?: Error): void => {
			const response: RPCResponse = {
				type: "response",
				id: message.id,
				result: error ? undefined : result,
				error: error instanceof Error ? serializeRPCError(error) : undefined,
			};

			Promise.resolve(this.driver.send(connection, response as unknown as Serializable)).catch((err) => {
				this.emit("error", new Error(`Failed to send response to ${message.method}: ${err.message}`));
			});
		};

		if (!handler) {
			sendResponse(undefined, new Error(`Unknown method: ${message.method}`));
			return;
		}

		const result = await handler(...message.args);

		if (result instanceof Error) {
			sendResponse(undefined, result);
		} else {
			sendResponse(result);
		}
	}

	private isRequestMessage(message: unknown): message is RPCRequest {
		if (!isPlainObject(message)) {
			return false;
		}

		const hasType = "type" in message && message["type"] === "request";
		const hasId = "id" in message && typeof message["id"] === "string";
		const hasMethod = "method" in message && typeof message["method"] === "string";
		const hasArgs = "args" in message && Array.isArray(message["args"]);

		return hasType && hasId && hasMethod && hasArgs;
	}
}

export function createTransportServer<D extends BaseServerDriver>(driver: D) {
	return new TransportServer(driver);
}
