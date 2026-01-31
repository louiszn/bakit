import EventEmitter from "node:events";

import { FrameCodec } from "@/lib/FrameCodec.js";

import type { Socket } from "node:net";
import type { IPCServer } from "./IPCServer.js";
import type { Serializable } from "@/types/message.js";

export interface IPCConnectionEvents {
	message: [message: Serializable];
	close: [];
	error: [error: Error];
}

export class IPCConnection extends EventEmitter<IPCConnectionEvents> {
	private codec: FrameCodec;

	public constructor(
		public server: IPCServer,
		public socket: Socket,
	) {
		super();

		this.codec = new FrameCodec(server["codecOptions"]);
		this.setupListeners();
	}

	public send(message: Serializable): Promise<void> {
		return this.server.sendSocket(this.socket, message);
	}

	public destroy() {
		this.socket.destroy();
	}

	private setupListeners() {
		this.socket.on("data", (chunk) => this.handleData(chunk));
		this.socket.on("close", () => this.emit("close"));
		this.socket.on("error", (err) => this.emit("error", err));
	}

	private handleData(chunk: Buffer) {
		try {
			const packets = this.codec.push(chunk);

			for (const packet of packets) {
				const message = FrameCodec.deserialize(packet);
				this.emit("message", message);
			}
		} catch (err) {
			this.emit("error", err as Error);
		}
	}
}
