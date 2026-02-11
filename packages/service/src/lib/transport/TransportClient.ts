import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";

import { Collection, isPlainObject } from "@bakit/utils";

import { createDynamicRPCError } from "@/lib/utils/rpcError.js";

import type { BaseClientDriver } from "../drivers/BaseDriver.js";
import type { RPCRequest, RPCResponse, RPCResponseError, Serializable } from "@/types/message.js";

interface PendingRequest {
	resolve: (value: unknown) => void;
	reject: (reason: Error) => void;
	timeout: NodeJS.Timeout;
	method: string;
	clientStack: string;
}

export interface TransportClientEvents {
	connect: [];
	disconnect: [];
	error: [error: Error];
	message: [message: Serializable];
}

export class TransportClient<D extends BaseClientDriver> extends EventEmitter<TransportClientEvents> {
	private pending = new Collection<string, PendingRequest>();

	public constructor(public readonly driver: D) {
		super();
		this.setupDriverListeners();
	}

	public connect() {
		return this.driver.connect();
	}

	public disconnect() {
		for (const req of this.pending.values()) {
			clearTimeout(req.timeout);
			req.reject(new Error(`Disconnected while waiting for response to "${req.method}"`));
		}
		this.pending.clear();

		return this.driver.disconnect();
	}

	public request<Result extends Serializable>(method: string, ...args: Serializable[]): Promise<Result> {
		if (!this.driver.ready) {
			throw new Error("Transport driver is not ready");
		}

		const id = randomUUID();
		const clientStack = this.captureCallStack();

		return new Promise<Result>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`Request to "${method}" timed out`));
			}, 5000);

			this.pending.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				timeout,
				method,
				clientStack,
			});

			Promise.resolve(
				this.driver.send({
					type: "request",
					id,
					method,
					args,
				} satisfies RPCRequest),
			).catch((err) => {
				clearTimeout(timeout);
				this.pending.delete(id);
				reject(err);
			});
		});
	}

	public send(message: Serializable) {
		return this.driver.send(message);
	}

	private setupDriverListeners(): void {
		this.driver.on("connect", () => this.emit("connect"));
		this.driver.on("disconnect", () => this.emit("disconnect"));
		this.driver.on("error", (err) => this.emit("error", err));
		this.driver.on("message", (msg) => this.handleMessage(msg));
	}

	private handleMessage(message: Serializable): void {
		this.emit("message", message);

		if (!this.isResponseMessage(message)) {
			return;
		}

		const pending = this.pending.get(message.id);

		if (!pending) {
			return;
		}

		clearTimeout(pending.timeout);
		this.pending.delete(message.id);

		if (message.error) {
			pending.reject(this.hydrateError(message.error, pending.clientStack));
		} else {
			pending.resolve(message.result);
		}
	}

	private hydrateError(errorData: RPCResponseError, callerStack: string): Error {
		const err = createDynamicRPCError(errorData);

		const serverStack = err.stack?.split("\n").slice(1).join("\n") ?? "";
		const separator = "\n--- Error originated on RPC server ---\n";

		err.stack = `${err}\n${callerStack}${separator}${serverStack}`;

		return err;
	}

	private captureCallStack(): string {
		const dummy = new Error();

		if (!dummy.stack) {
			return "";
		}

		// Remove first two lines: "Error" + this.captureCallStack frame
		return dummy.stack.split("\n").slice(2).join("\n");
	}

	private isResponseMessage(message: unknown): message is RPCResponse {
		if (!isPlainObject(message)) {
			return false;
		}

		const hasType = "type" in message && message["type"] === "response";
		const hasId = "id" in message && typeof message["id"] === "string";
		const hasResult = "result" in message;
		const hasError = "error" in message && message["error"] !== undefined;

		return hasType && hasId && hasResult !== hasError;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTransportClient<D extends BaseClientDriver<object, any>>(driver: D) {
	return new TransportClient(driver);
}
