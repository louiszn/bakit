import EventEmitter from "node:events";

import { isPlainObject } from "@bakit/utils";

import type { BaseServerDriver } from "../drivers/BaseDriver.js";
import type { RPCRequest, RPCResponse, Serializable } from "@/types/message.js";

export type RPCHandler = (...args: Serializable[]) => Promise<Serializable>;

export class TransportServer<D extends BaseServerDriver> extends EventEmitter {
	private handlers = new Map<string, RPCHandler>();

	public constructor(public readonly driver: D) {
		super();

		this.setupDriverListeners();
	}

	public handle(method: string, handler: RPCHandler): void {
		if (this.handlers.has(method)) {
			throw new Error(`Method ${method} is already registered`);
		}

		this.handlers.set(method, handler);
	}

	private setupDriverListeners(): void {
		this.driver.on("listen", () => this.emit("listen"));
		this.driver.on("close", () => this.emit("close"));
		this.driver.on("error", (err) => this.emit("error", err));
		this.driver.on("clientConnect", (client) => this.emit("clientConnect", client));
		this.driver.on("clientDisconnect", (client) => this.emit("clientDisconnect", client));
		this.driver.on("message", (client, msg) => this.handleMessage(client, msg));
	}

	private async handleMessage(client: unknown, msg: Serializable): Promise<void> {
		if (!this.isRequestMessage(msg)) {
			return;
		}

		const handler = this.handlers.get(msg.method);

		const sendResponse = (result: Serializable, error?: Error): void => {
			const response: Serializable = {
				type: "response",
				id: msg.id,
				result: error ? undefined : result,
				error: error instanceof Error ? this.serializeError(error) : undefined,
			} satisfies RPCResponse;

			Promise.resolve(this.driver.send(client, response)).catch((err) => {
				this.emit("error", new Error(`Failed to send response to ${msg.method}: ${err.message}`));
			});
		};

		if (!handler) {
			sendResponse(undefined, new Error(`Unknown method: ${msg.method}`));
			return;
		}

		try {
			const result = await handler(...msg.args);
			sendResponse(result);
		} catch (err) {
			sendResponse(undefined, err as Error);
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

	private serializeError(err: Error): RPCResponse["error"] {
		return {
			message: err.message,
			stack: err.stack,
			code: "code" in err ? (err.code as string) : undefined,
		};
	}
}

export function createTransportServer<D extends BaseServerDriver>(driver: D) {
	return new TransportServer(driver);
}
