import { randomUUID } from "node:crypto";
import EventEmitter from "node:events";

import type { ChildProcess, Serializable } from "node:child_process";
import type { MessagePort } from "node:worker_threads";

export const RPC_RESPONSE_MARK = `$DONE:`;
export const RPC_RESPONSE_TIMEOUT = 5_000;

export interface BaseRPCMessage {
	id: string;
}

export interface BaseRPCResponse {
	id: `${typeof RPC_RESPONSE_MARK}${string}`;
}

export interface RPCRequest<Data extends Serializable = Serializable> extends BaseRPCMessage {
	type: string;
	data: Data;
}

export interface RPCSuccessResponse<Data extends Serializable = Serializable> extends BaseRPCResponse {
	data: Data;
}

export interface RPCErrorResponse extends BaseRPCResponse {
	error: string;
}

export type RPCResponse<Data extends Serializable = Serializable> = RPCSuccessResponse<Data> | RPCErrorResponse;
export type RPCMessage<Data extends Serializable = Serializable> = RPCRequest<Data> | RPCResponse<Data>;

export interface RPCPendingPromise {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolve: (data: any) => void;
	reject: (error: unknown) => void;
	timeout: NodeJS.Timeout;
}

export class RPC extends EventEmitter {
	public requests = new Map<string, RPCPendingPromise>();

	public constructor(public transport: MessagePort | NodeJS.Process | ChildProcess) {
		super();
		this.transport.on("message", (message: RPCMessage<Serializable>) => this.onMessage(message));
	}

	public postMessage(message: Serializable) {
		const { transport } = this;

		if ("send" in transport) {
			transport.send(message);
		} else if ("postMessage" in transport) {
			transport.postMessage(message);
		} else {
			console.warn(`${transport.constructor.name} doesn't support IPC`);
		}
	}

	private onMessage(message: RPCMessage<Serializable>) {
		if (message.id.startsWith(RPC_RESPONSE_MARK)) {
			this.handleResponseMessage(message as RPCResponse);
			return;
		}

		if ("type" in message) {
			this.handleRequestMessage(message);
			return;
		}
	}

	private handleResponseMessage(message: RPCResponse) {
		const id = message.id.slice(RPC_RESPONSE_MARK.length);
		const request = this.requests.get(id);

		if (!request) {
			return;
		}

		const { reject, resolve, timeout } = request;

		this.requests.delete(id);
		clearTimeout(timeout);

		if ("data" in message) {
			resolve(message.data);
		} else {
			reject(new Error(message.error));
		}
	}

	private handleRequestMessage(message: RPCRequest) {
		this.emit("message", message);
		this.emit(message.type, message.id, message.data);
	}

	public send<Data extends Serializable>(type: string, data: Data = {} as never, id: string = randomUUID()) {
		const message: RPCRequest<Data> = {
			id,
			type,
			data,
		};

		this.postMessage(message);
	}

	public success<Data extends Serializable>(id: string, data: Data) {
		const message: RPCSuccessResponse<Data> = {
			id: `${RPC_RESPONSE_MARK}${id}`,
			data,
		};

		this.postMessage(message);
	}

	public error(id: string, error: string) {
		const message: RPCErrorResponse = {
			id: `${RPC_RESPONSE_MARK}${id}`,
			error,
		};

		this.postMessage(message);
	}

	public request<Data extends Serializable, Output extends Serializable>(
		type: string,
		data: Data,
		id: string = randomUUID(),
	) {
		return new Promise<Output>((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (this.requests.delete(id)) {
					reject(new Error("Request timed out"));
				}
			}, RPC_RESPONSE_TIMEOUT);

			this.requests.set(id, {
				resolve,
				reject,
				timeout,
			});

			this.send(type, data, id);
		});
	}
}
