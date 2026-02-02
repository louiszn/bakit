import EventEmitter from "node:events";
import { createInflate, type Inflate, constants as zlibConstants } from "node:zlib";
import { TextDecoder } from "node:util";

import WebSocket, { type RawData } from "ws";

import {
	GatewayCloseCodes,
	GatewayDispatchEvents,
	GatewayOpcodes,
	type GatewayDispatchPayload,
	type GatewayReadyDispatchData,
	type GatewayReceivePayload,
	type GatewaySendPayload,
} from "discord-api-types/v10";

export enum ShardState {
	Idle,
	Connecting,
	Ready,
	Resuming,
	Disconnecting,
	Disconnected,
}

export enum ShardStrategy {
	Resume,
	Reconnect,
	Shutdown,
}

export interface ShardOptions {
	total: number;
	token: string;
	intents: number | bigint;
	gateway: {
		baseURL: string;
		version: number;
	};
}

export interface ShardEvents {
	ready: [data: GatewayReadyDispatchData];
	disconnect: [code: number];
	resume: [];
	error: [error: Error];
	debug: [message: string];
	raw: [payload: GatewayReceivePayload];
	dispatch: [payload: GatewayDispatchPayload];
	needIdentify: [];
}

export class Shard extends EventEmitter<ShardEvents> {
	#state = ShardState.Idle;
	#ws?: WebSocket;
	#inflater?: Inflate;
	#textDecoder = new TextDecoder();
	#decompressBuffer: Buffer[] = [];

	#sessionId?: string;
	#lastSequence?: number;
	#resumeGatewayURL?: string;

	#lastHeartbeatSent = -1;
	#lastHeartbeatAck = -1;
	#missedHeartbeats = 0;
	#heartbeatInterval?: NodeJS.Timeout;
	#heartbeatTimeout?: NodeJS.Timeout;
	#reconnectTimeout?: NodeJS.Timeout;

	#strategy?: ShardStrategy;

	public constructor(
		public readonly id: number,
		public readonly options: ShardOptions,
	) {
		super();
	}

	public get state() {
		return this.#state;
	}

	public get latency() {
		if (this.#lastHeartbeatSent === -1 || this.#lastHeartbeatAck === -1) {
			return -1;
		}

		return this.#lastHeartbeatAck - this.#lastHeartbeatSent;
	}

	public get resumable(): boolean {
		const hasSessionId = this.#sessionId !== undefined;
		const hasSequence = this.#lastSequence !== undefined;
		const shouldResume = this.#strategy === ShardStrategy.Resume;

		return shouldResume && hasSequence && hasSessionId;
	}

	public async connect(): Promise<void> {
		if (this.#state !== ShardState.Idle && this.#state !== ShardState.Disconnected) {
			throw new Error("Shard already connecting or connected");
		}

		return new Promise((resolve, reject) => {
			const cleanup = () => {
				this.off("error", onError);
				this.off("ready", onReady);
			};

			const onReady = () => {
				cleanup();
				resolve();
			};
			const onError = (err: Error) => {
				cleanup();
				reject(err);
			};

			this.once("ready", onReady);
			this.once("error", onError);

			this.#init();
		});
	}

	public disconnect(code: number) {
		return new Promise<void>((resolve) => {
			this.#state = ShardState.Disconnecting;
			this.#strategy = ShardStrategy.Shutdown;

			if (!this.#ws) {
				resolve();
				return;
			}

			this.#ws.once("close", () => {
				resolve();
			});

			this.#ws.close(code);
		});
	}

	public resume() {
		if (!this.resumable) {
			return;
		}

		this.#state = ShardState.Resuming;

		this.send({
			op: GatewayOpcodes.Resume,
			d: {
				token: this.options.token,
				session_id: this.#sessionId!,
				seq: this.#lastSequence!,
			},
		});
	}

	public identify() {
		this.send({
			op: GatewayOpcodes.Identify,
			d: {
				token: this.options.token,
				intents: Number(this.options.intents),
				properties: {
					os: process.platform,
					browser: "bakit",
					device: "bakit",
				},
				shard: [this.id, this.options.total],
			},
		});
	}

	public send(payload: GatewaySendPayload) {
		if (this.#ws?.readyState === WebSocket.OPEN) {
			this.#ws.send(JSON.stringify(payload));
		}
	}

	public sendHeartbeat() {
		if (this.#lastHeartbeatSent !== -1 && this.#lastHeartbeatAck < this.#lastHeartbeatSent) {
			this.#missedHeartbeats++;
		} else {
			this.#missedHeartbeats = 0;
		}

		if (this.#missedHeartbeats >= 2) {
			this.emit("debug", "Missed 2 heartbeats, reconnecting");
			this.#ws?.terminate();
			return;
		}

		this.send({
			op: GatewayOpcodes.Heartbeat,
			d: this.#lastSequence ?? null,
		});

		this.#lastHeartbeatSent = Date.now();
	}

	#init() {
		this.#state = ShardState.Connecting;
		this.#strategy ??= ShardStrategy.Reconnect; // Default to fresh connect

		const url = new URL(
			this.#strategy === ShardStrategy.Resume && this.#resumeGatewayURL
				? this.#resumeGatewayURL
				: this.options.gateway.baseURL,
		);

		url.searchParams.set("v", String(this.options.gateway.version));
		url.searchParams.set("encoding", "json");
		url.searchParams.set("compress", "zlib-stream");

		this.#ws = new WebSocket(url, { perMessageDeflate: false });
		this.#inflater = createInflate({ flush: zlibConstants.Z_SYNC_FLUSH });

		this.#inflater.on("data", (chunk) => this.#onInflate(chunk));
		this.#inflater.on("error", (err) => {
			this.emit("error", err);
			this.#ws?.terminate();
		});

		this.#ws.on("message", (data) => this.#onMessage(data));
		this.#ws.on("close", (code) => this.#onClose(code));
		this.#ws.on("error", (err) => this.emit("error", err));
	}

	#onMessage(data: RawData) {
		if (!this.#inflater) {
			// Non-compressed message
			try {
				const text = data.toString();
				const payload = JSON.parse(text);

				this.#handlePayload(payload);
			} catch (error) {
				this.emit("error", error as Error);
			}
			return;
		}

		let buffer: Buffer;

		if (Buffer.isBuffer(data)) {
			buffer = data;
		} else if (Array.isArray(data)) {
			buffer = Buffer.concat(data);
		} else if (data instanceof ArrayBuffer) {
			buffer = Buffer.from(data);
		} else {
			buffer = Buffer.from(String(data));
		}

		// Check for Z_SYNC_FLUSH marker
		const hasSyncFlush =
			buffer.length >= 4 &&
			buffer[buffer.length - 4] === 0x00 &&
			buffer[buffer.length - 3] === 0x00 &&
			buffer[buffer.length - 2] === 0xff &&
			buffer[buffer.length - 1] === 0xff;

		// Write to inflater
		this.#inflater.write(buffer, (writeError) => {
			if (writeError) {
				this.emit("error", writeError);
				return;
			}

			if (hasSyncFlush) {
				// Force flush to process complete message
				this.#inflater?.flush(zlibConstants.Z_SYNC_FLUSH);
			}
		});
	}

	#onInflate(chunk: Buffer) {
		this.#decompressBuffer.push(chunk);

		try {
			const fullBuffer = Buffer.concat(this.#decompressBuffer);
			const text = this.#textDecoder.decode(fullBuffer);

			const payload = JSON.parse(text);
			this.#handlePayload(payload);

			this.#decompressBuffer = [];
		} catch (error) {
			if (error instanceof SyntaxError) {
				// Check if this looks like truncated JSON
				const fullBuffer = Buffer.concat(this.#decompressBuffer);
				const text = this.#textDecoder.decode(fullBuffer);

				if (text.includes("{") && !isValidJSON(text)) {
					return; // Wait for more data
				}

				this.emit("error", error);
				this.#decompressBuffer = [];
			}
		}
	}

	#handlePayload(payload: GatewayReceivePayload) {
		this.emit("raw", payload);

		switch (payload.op) {
			case GatewayOpcodes.Dispatch: {
				this.#handleDispatch(payload);
				break;
			}

			case GatewayOpcodes.Hello: {
				this.#startHeartbeat(payload.d.heartbeat_interval);

				if (this.resumable) {
					this.resume();
				} else {
					this.emit("needIdentify");
				}

				break;
			}

			case GatewayOpcodes.Heartbeat: {
				this.sendHeartbeat();
				break;
			}

			case GatewayOpcodes.HeartbeatAck: {
				this.#lastHeartbeatAck = Date.now();
				break;
			}

			case GatewayOpcodes.InvalidSession: {
				// Discord explicitly tells us whether RESUME is allowed
				const shouldResume = payload.d;

				if (shouldResume) {
					this.#strategy = ShardStrategy.Resume;
				} else {
					// Session is dead, must IDENTIFY again
					this.#strategy = ShardStrategy.Reconnect;

					this.#sessionId = undefined;
					this.#lastSequence = undefined;
					this.#resumeGatewayURL = undefined;
				}

				this.emit("debug", `Invalid session (resumable=${this.resumable})`);

				this.#ws?.terminate();
				break;
			}

			case GatewayOpcodes.Reconnect: {
				// Discord requests a reconnect, but session is still valid to resume
				this.#strategy = ShardStrategy.Resume;

				this.emit("debug", "Reconnecting to gateway");
				this.#ws?.terminate();

				break;
			}
		}
	}

	#handleDispatch(payload: GatewayDispatchPayload) {
		this.#lastSequence = payload.s;
		this.emit("dispatch", payload);

		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				const { d: data } = payload;

				this.#state = ShardState.Ready;

				this.#sessionId = data.session_id;
				this.#resumeGatewayURL = data.resume_gateway_url;

				this.emit("ready", data);
				break;
			}

			case GatewayDispatchEvents.Resumed: {
				this.#state = ShardState.Ready;
				this.#strategy = undefined;

				this.emit("resume");
				break;
			}
		}
	}

	#onClose(code: number) {
		this.#cleanup();

		this.#state = ShardState.Disconnected;
		this.emit("disconnect", code);

		if (this.#strategy === ShardStrategy.Shutdown) {
			switch (code) {
				case GatewayCloseCodes.AuthenticationFailed:
					this.emit("error", new Error("Invalid token provided"));
					break;
				case GatewayCloseCodes.InvalidIntents:
					this.emit("error", new Error("Invalid intents provided"));
					break;
				case GatewayCloseCodes.DisallowedIntents:
					this.emit("error", new Error("Disallowed intents provided"));
					break;
			}

			return;
		} else if (!this.#strategy) {
			this.#strategy = this.#getStrategy(code);
		}

		if (this.#strategy === ShardStrategy.Reconnect || this.#strategy === ShardStrategy.Resume) {
			this.#scheduleReconnect();
		}
	}

	#getStrategy(code: GatewayCloseCodes | number): ShardStrategy {
		switch (code) {
			case GatewayCloseCodes.AuthenticationFailed:
			case GatewayCloseCodes.InvalidIntents:
			case GatewayCloseCodes.DisallowedIntents: {
				return ShardStrategy.Shutdown;
			}

			case GatewayCloseCodes.InvalidSeq:
			case GatewayCloseCodes.SessionTimedOut: {
				return ShardStrategy.Reconnect;
			}

			default: {
				return ShardStrategy.Resume;
			}
		}
	}

	#scheduleReconnect(delay = 1000) {
		if (this.#reconnectTimeout) {
			return;
		}

		this.#reconnectTimeout = setTimeout(() => {
			this.#reconnectTimeout = undefined;
			this.#state = ShardState.Idle;
			this.#init();
		}, delay);
	}

	#startHeartbeat(interval: number) {
		if (this.#heartbeatInterval) {
			clearInterval(this.#heartbeatInterval);
			this.#heartbeatInterval = undefined;
		}

		const jitter = Math.random();
		const firstDelay = Math.floor(interval * jitter);

		this.emit("debug", `Starting heartbeat (interval=${interval}ms, jitter=${firstDelay}ms)`);

		this.#heartbeatTimeout = setTimeout(() => {
			this.sendHeartbeat();
			this.#heartbeatInterval = setInterval(() => this.sendHeartbeat(), interval);
		}, firstDelay);
	}

	#cleanup(): void {
		clearTimeout(this.#reconnectTimeout);
		clearInterval(this.#heartbeatInterval);
		clearTimeout(this.#heartbeatTimeout);

		this.#inflater?.destroy();
		this.#inflater = undefined;

		this.#ws?.removeAllListeners();
		this.#ws = undefined;

		this.#decompressBuffer = [];
		this.#missedHeartbeats = 0;
	}
}

function isValidJSON(str: string): boolean {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
}
