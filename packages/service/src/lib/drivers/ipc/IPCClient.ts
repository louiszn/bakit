import { createConnection, Socket } from "node:net";
import PQueue from "p-queue";

import { BaseClientDriver, type BaseClientDriverEvents } from "../BaseDriver.js";
import { FrameCodec, type FrameCodecOptions } from "@/lib/FrameCodec.js";
import { getIPCPath } from "@/lib/utils/ipc.js";

import type { Serializable } from "@/types/message.js";

export interface IPCClientOptions {
	id: string;
	codec?: FrameCodecOptions;
	reconnect?: IPCClientReconnectOptions;
}

export interface IPCClientReconnectOptions {
	/** Enable auto-reconnect (default: true) */
	enabled?: boolean;
	/** Max retry attempts (default: 5) */
	maxRetries?: number;
	/** Initial delay in ms (default: 1000) */
	initialDelay?: number;
	/** Backoff multiplier (default: 1.5) */
	backoff?: number;
	/** Max delay in ms (default: 30000) */
	maxDelay?: number;
}

export interface IPCClientEvents extends BaseClientDriverEvents {
	reconnect: [];
	reconnecting: [attempt: number, delay: number];
}

export enum IPCClientState {
	Idle,
	Connecting,
	Connected,
	Disconnected,
}

export const DEFAULT_IPC_CLIENT_RECONNECT_OPTIONS: Required<IPCClientReconnectOptions> = {
	enabled: true,
	maxRetries: 5,
	initialDelay: 1000,
	backoff: 1.5,
	maxDelay: 30000,
};

export class IPCClient extends BaseClientDriver<IPCClientOptions, IPCClientEvents> {
	private socket?: Socket;
	private codec: FrameCodec;

	public state: IPCClientState = IPCClientState.Idle;
	private _ready = false;

	private reconnectTimer?: NodeJS.Timeout;
	private reconnectOptions: Required<IPCClientReconnectOptions>;
	private reconnectAttempt = 0;
	private isIntentionalClose = false;

	private queue = new PQueue({
		concurrency: 1,
		autoStart: false,
	});

	public constructor(options: IPCClientOptions) {
		super(options);

		this.codec = new FrameCodec(options.codec);
		this.reconnectOptions = { ...DEFAULT_IPC_CLIENT_RECONNECT_OPTIONS, ...options.reconnect };
	}

	get path() {
		return getIPCPath(this.options.id);
	}

	get ready() {
		return this._ready;
	}

	public connect(): Promise<void> {
		if (this.socket) {
			throw new Error(`Socket is already connected to '${this.options.id}'.`);
		}

		return new Promise((resolve, reject) => {
			this.once("connect", resolve);
			this.init().catch(reject);
		});
	}

	public send(message: Serializable) {
		return this.queue.add(() => this.makeMessage(message));
	}

	public disconnect() {
		return new Promise<void>((resolve) => {
			if (!this.socket || this.state === IPCClientState.Idle) {
				resolve(); // Already disconnected
				return;
			}

			this.once("disconnect", resolve);

			this.isIntentionalClose = true;
			this.cleanup(true);
		});
	}

	private async init() {
		if (this.socket) {
			throw new Error(`Socket is already connected to '${this.options.id}'.`);
		}

		this.state = IPCClientState.Connecting;

		this.socket = createConnection(this.path);

		this.socket.on("connect", () => this.onSocketConnect());
		this.socket.on("data", (data) => this.onSocketData(data));
		this.socket.on("close", () => this.onSocketClose());
		this.socket.on("error", (err) => this.onSocketError(err));
	}

	private cleanup(hard = false) {
		this.reconnectAttempt = 0;
		this.clearReconnectTimer();

		// Pause queue to prevent new tasks from starting
		this.queue.pause();

		if (hard) {
			this.queue.clear();
		}

		if (this.socket) {
			if (!this.socket.destroyed) {
				this.socket.destroy();
			}

			this.socket = undefined;
		}

		this.state = IPCClientState.Disconnected;
	}

	private onSocketConnect() {
		this.state = IPCClientState.Connected;

		const isReconnected = this.reconnectAttempt > 0 && this.ready;

		this.reconnectAttempt = 0;
		this._ready = true;
		this.isIntentionalClose = false;

		this.queue.start();

		if (isReconnected) {
			this.emit("reconnect");
		} else {
			this.emit("connect");
		}
	}

	private onSocketClose() {
		// Clean up is called manually on disconnect()
		if (this.isIntentionalClose) {
			this.emit("disconnect");
			return;
		}

		const shouldReconnect =
			this.reconnectOptions.enabled &&
			(this.state === IPCClientState.Connected || this.reconnectAttempt < this.reconnectOptions.maxRetries);

		this.cleanup();

		if (shouldReconnect) {
			this.scheduleReconnect();
		} else {
			this.emit("disconnect");
		}
	}

	private onSocketError(err: Error) {
		if ("code" in err && (err.code === "ECONNREFUSED" || err.code === "ENOENT")) {
			// Let close event handle reconnect
			return;
		}

		this.emit("error", err);
	}

	private onSocketData(chunk: Buffer) {
		const packets = this.codec.push(chunk);

		for (const packet of packets) {
			const message = this.deserialize(packet);
			this.emit("message", message);
		}
	}

	private scheduleReconnect() {
		if (this.reconnectAttempt >= this.reconnectOptions.maxRetries) {
			this.emit("error", new Error(`Reconnect failed after ${this.reconnectOptions.maxRetries} attempts`));
			this.disconnect();
			return;
		}

		const delay = Math.min(
			this.reconnectOptions.initialDelay * Math.pow(this.reconnectOptions.backoff, this.reconnectAttempt),
			this.reconnectOptions.maxDelay,
		);

		this.reconnectAttempt++;
		this.emit("reconnecting", this.reconnectAttempt, delay);

		this.reconnectTimer = setTimeout(() => {
			this.init().catch((err) => {
				this.emit("error", err);
			});
		}, delay);
	}

	private clearReconnectTimer() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
	}

	private makeMessage(message: Serializable) {
		const { socket } = this;

		if (!socket || socket.destroyed) {
			return Promise.reject(new Error("Socket not available"));
		}

		const payload = this.serialize(message);
		const frame = this.codec.encode(payload);

		return new Promise<void>((resolve, reject) => {
			socket.write(frame, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	private serialize(obj: Serializable): Buffer {
		return Buffer.from(JSON.stringify(obj));
	}

	private deserialize(buf: Buffer): Serializable {
		return JSON.parse(buf.toString());
	}
}

export function createIPCClient(options: IPCClientOptions) {
	return new IPCClient(options);
}
