import { WebSocket, type RawData } from "ws";
import { createInflate, type Inflate, constants as zlibConstants } from "node:zlib";

import { attachEventBus, type EventBus } from "@bakit/utils";

import {
	GatewayCloseCodes,
	GatewayDispatchEvents,
	GatewayOpcodes,
	type GatewayDispatchPayload,
	type GatewayReadyDispatchData,
	type GatewayReceivePayload,
	type GatewaySendPayload,
} from "discord-api-types/gateway";
import type { ValueOf, OptionalKeysOf } from "type-fest";

const INCOMPLETE_JSON_REGEX = /unexpected end|unterminated|unexpected eof|end of json/i;

export interface ShardOptions {
	id: number;
	total: number;
	token: string;
	intents: number | bigint;
	gateway?: ShardGatewayOptions;
}

export interface ShardGatewayOptions {
	baseURL: string;
	version: number;
}

const DEFAULT_SHARD_OPTIONS = {
	gateway: {
		baseURL: "wss://gateway.discord.gg",
		version: 10,
	},
} satisfies Pick<ShardOptions, OptionalKeysOf<ShardOptions>>;

export interface ShardEvents {
	ready: [payload: GatewayReadyDispatchData];
	disconnect: [code: number];
	resume: [];

	error: [error: Error];
	debug: [message: string];

	raw: [payload: GatewayReceivePayload];
	dispatch: [payload: GatewayDispatchPayload];

	requestIdentify: [];
}

/**
 * High-level lifecycle state of the shard connection.
 */
export const ShardState = {
	/** Not connected. */
	Idle: 0,
	/** Initialzing connection. */
	Connecting: 1,
	/** Connected to gateway and identified. */
	Ready: 2,
	/** Resuming the session. */
	Resuming: 3,
	/** Disconnected the connection. */
	Disconnected: 4,
};
export type ShardState = ValueOf<typeof ShardState>;

/**
 * Strategy describes *what to do next after a disconnect*.
 * This is intentionally separate from ShardState.
 */
export const ShardStrategy = {
	/** No decision yet (default on close). */
	Unknown: 1,
	/** Reconnect with IDENTIFY (new session). */
	Reconnect: 2,
	/** Reconnect and try RESUME. */
	Resume: 3,
	/** Do not reconnect. */
	Shutdown: 4,
};
export type ShardStrategy = ValueOf<typeof ShardStrategy>;

export interface Shard extends EventBus<ShardEvents> {
	readonly id: number;
	readonly state: ShardState;
	readonly latency: number;

	connect(): Promise<void>;
	disconnect(code?: number): Promise<void>;

	send(payload: GatewaySendPayload): void;
	identify(): void;
}

/**
 * Creates a shard object which can be used to connect to the Discord gateway.
 *
 * @param {ShardOptions} options - The options to create the shard with.
 * @returns {Shard} - The created shard object.
 */
export function createShard(options: ShardOptions): Shard {
	const resolvedOptions = { ...DEFAULT_SHARD_OPTIONS, ...options };

	let state: ShardState = ShardState.Idle;
	let strategy: ShardStrategy = ShardStrategy.Unknown;

	let ws: WebSocket | undefined;
	let resumeGatewayURL: string | undefined;

	let inflater: Inflate | undefined;
	let inflateBuffer: Buffer = Buffer.alloc(0);

	let sessionId: string | undefined;
	let lastSequence: number | undefined;

	let lastHeartbeatSent = -1;
	let lastHeartbeatAcknowledged = -1;
	let missedHeartbeats = 0;

	let reconnectTimeout: NodeJS.Timeout | undefined;
	let heartbeatTimeout: NodeJS.Timeout | undefined;
	let heartbeatInterval: NodeJS.Timeout | undefined;

	const base = {
		send,
		connect,
		disconnect,
		identify,

		get id() {
			return options.id;
		},
		get state() {
			return state;
		},

		get latency() {
			if (lastHeartbeatSent === -1 || lastHeartbeatAcknowledged === -1) {
				return -1;
			}

			return lastHeartbeatAcknowledged - lastHeartbeatSent;
		},
	};

	const self: Shard = attachEventBus<ShardEvents, typeof base>(base);

	function init() {
		// Only allow connecting from Idle or Disconnected
		if (state !== ShardState.Idle && state !== ShardState.Disconnected) {
			self.emit("error", new Error("Shard is already connected or connecting."));
			return;
		}

		if (strategy === ShardStrategy.Shutdown) {
			return;
		}

		state = ShardState.Connecting;

		const { gateway } = resolvedOptions;

		// Use resume gateway URL only if strategy explicitly allows resuming
		// (Discord may give a different gateway for RESUME)
		const baseURL = isResumable() && resumeGatewayURL ? resumeGatewayURL : gateway.baseURL;
		const url = new URL(baseURL);

		url.searchParams.set("v", gateway.version.toString());
		url.searchParams.set("encoding", "json");
		url.searchParams.set("compress", "zlib-stream");

		ws = new WebSocket(url.toString(), {
			perMessageDeflate: false,
		});

		// Inflate stream configured for Discord's Z_SYNC_FLUSH framing
		inflater = createInflate({
			flush: zlibConstants.Z_SYNC_FLUSH,
		});

		inflater.on("data", onInflate);

		inflater.on("error", (err) => {
			self.emit("error", err);
			ws?.terminate();
		});

		ws.on("message", onMessage);
		ws.on("close", onClose);
		ws.on("error", (err) => self.emit("error", err));
	}

	function isJSONIncomplete(err: unknown) {
		return err instanceof Error && INCOMPLETE_JSON_REGEX.test(err.message);
	}

	function cleanup() {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = undefined;
		}

		if (heartbeatTimeout) {
			clearTimeout(heartbeatTimeout);
			heartbeatTimeout = undefined;
		}

		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = undefined;
		}

		if (inflater) {
			inflater.destroy();
			inflater = undefined;
		}

		inflateBuffer = Buffer.alloc(0);

		if (ws) {
			if (ws.readyState !== WebSocket.CLOSED) {
				ws.terminate();
			}

			ws.removeAllListeners();
			ws = undefined;
		}

		missedHeartbeats = 0;
		lastHeartbeatSent = -1;
		lastHeartbeatAcknowledged = -1;
	}

	function connect() {
		return new Promise<void>((resolve) => {
			// Prevent duplicate connect attempts
			if (state !== ShardState.Idle && state !== ShardState.Disconnected) {
				return;
			}

			// Reset strategy; let gateway decide resume vs identify
			strategy = ShardStrategy.Unknown;

			self.once("ready", () => resolve());

			init();
		});
	}

	function disconnect(code = 1000) {
		return new Promise<void>((resolve) => {
			strategy = ShardStrategy.Shutdown;

			if (!ws) {
				resolve();
				return;
			}

			ws.once("close", () => {
				resolve();
			});

			ws.close(code);
		});
	}

	function onMessage(data: RawData) {
		if (!(data instanceof Buffer) || !inflater) {
			return;
		}

		// Safety: Discord's max payload size is 4MB compressed
		if (data.length > 4 * 1024 * 1024) {
			self.emit("error", new Error(`Compressed payload too large: ${data.length} bytes`));
			ws?.terminate();
			return;
		}

		try {
			// Feed compressed data to inflater
			// Z_SYNC_FLUSH mode automatically handles frame boundaries
			inflater.write(data);
		} catch (err) {
			self.emit("error", new Error(`Zlib inflation error: ${err instanceof Error ? err.message : String(err)}`));
			ws?.terminate();
		}
	}

	function onInflate(chunk: Buffer) {
		inflateBuffer = Buffer.concat([inflateBuffer, chunk]);

		// Safety cap (Discord's decompressed limit is 8MB)
		if (inflateBuffer.length > 8 * 1024 * 1024) {
			self.emit("error", new Error("Decompressed buffer overflow (8MB limit)"));
			ws?.terminate();
			return;
		}

		// Process complete JSON messages (newline-delimited)
		let start = 0;
		while (start < inflateBuffer.length) {
			// Find next newline
			const newlinePos = inflateBuffer.indexOf(0x0a, start);

			if (newlinePos === -1) {
				// No complete message yet
				// Keep unprocessed data in buffer
				if (start > 0) {
					inflateBuffer = inflateBuffer.subarray(start);
				}
				return;
			}

			// Extract single JSON message
			const messageSlice = inflateBuffer.subarray(start, newlinePos);

			try {
				const payload = JSON.parse(messageSlice.toString("utf8"));
				handlePayload(payload);
			} catch (err) {
				if (!isJSONIncomplete(err)) {
					self.emit(
						"error",
						new Error(`Failed to parse gateway payload: ${err instanceof Error ? err.message : String(err)}`),
					);

					// Clear buffer to avoid getting stuck
					inflateBuffer = Buffer.alloc(0);
					return;
				}

				// Incomplete JSON, wait for more data
				inflateBuffer = inflateBuffer.subarray(start);
				return;
			}

			// Move to next message
			start = newlinePos + 1;
		}

		// All messages processed, clear buffer
		inflateBuffer = Buffer.alloc(0);
	}

	function onClose(code: number) {
		cleanup();

		state = ShardState.Disconnected;
		self.emit("disconnect", code);

		if (strategy === ShardStrategy.Shutdown) {
			switch (code) {
				case GatewayCloseCodes.AuthenticationFailed:
					self.emit("error", new Error("Invalid token provided"));
					break;
				case GatewayCloseCodes.InvalidIntents:
					self.emit("error", new Error("Invalid intents provided"));
					break;
				case GatewayCloseCodes.DisallowedIntents:
					self.emit("error", new Error("Disallowed intents provided"));
					break;
			}

			return;
		}

		if (strategy === ShardStrategy.Unknown) {
			strategy = getReconnectStrategy(code);
		}

		if (strategy === ShardStrategy.Reconnect || strategy === ShardStrategy.Resume) {
			scheduleReconnect();
		}
	}

	function handlePayload(payload: GatewayReceivePayload) {
		self.emit("raw", payload);

		switch (payload.op) {
			case GatewayOpcodes.Dispatch: {
				handleDispatch(payload);
				break;
			}

			case GatewayOpcodes.Hello: {
				startHeartbeat(payload.d.heartbeat_interval);

				if (isResumable()) {
					resume();
				} else {
					self.emit("requestIdentify");
				}

				break;
			}

			case GatewayOpcodes.Heartbeat: {
				sendHeartbeat();
				break;
			}

			case GatewayOpcodes.HeartbeatAck: {
				lastHeartbeatAcknowledged = Date.now();
				break;
			}

			case GatewayOpcodes.InvalidSession: {
				// Discord explicitly tells us whether RESUME is allowed
				const shouldResume = payload.d;

				if (shouldResume) {
					strategy = ShardStrategy.Resume;
				} else {
					// Session is dead, must IDENTIFY again
					strategy = ShardStrategy.Reconnect;

					sessionId = undefined;
					lastSequence = undefined;
					resumeGatewayURL = undefined;
				}

				self.emit("debug", `Invalid session (resumable=${isResumable()})`);

				ws?.terminate();
				break;
			}

			case GatewayOpcodes.Reconnect: {
				// Discord requests a reconnect, but session is still valid to resume
				strategy = ShardStrategy.Resume;

				self.emit("debug", "Reconnecting to gateway");
				ws?.terminate();

				break;
			}
		}
	}

	function handleDispatch(payload: GatewayDispatchPayload) {
		lastSequence = payload.s;
		self.emit("dispatch", payload);

		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				const { d: data } = payload;

				state = ShardState.Ready;

				sessionId = data.session_id;
				resumeGatewayURL = data.resume_gateway_url;

				self.emit("ready", data);
				break;
			}

			case GatewayDispatchEvents.Resumed: {
				state = ShardState.Ready;
				strategy = ShardStrategy.Unknown;

				self.emit("resume");
				break;
			}
		}
	}

	function isResumable(): boolean {
		const hasSessionId = sessionId !== undefined;
		const hasSequence = lastSequence !== undefined;
		const shouldResume = strategy === ShardStrategy.Resume;

		return shouldResume && hasSequence && hasSessionId;
	}

	function getReconnectStrategy(code: GatewayCloseCodes | number): ShardStrategy {
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

	function identify() {
		send({
			op: GatewayOpcodes.Identify,
			d: {
				token: resolvedOptions.token,
				intents: Number(resolvedOptions.intents),
				properties: {
					os: process.platform,
					browser: "bakit",
					device: "bakit",
				},
				shard: [resolvedOptions.id, resolvedOptions.total],
			},
		});
	}

	function resume() {
		state = ShardState.Resuming;

		send({
			op: GatewayOpcodes.Resume,
			d: {
				token: resolvedOptions.token,
				session_id: sessionId!,
				seq: lastSequence!,
			},
		});
	}

	function sendHeartbeat() {
		if (lastHeartbeatSent !== -1 && lastHeartbeatAcknowledged < lastHeartbeatSent) {
			missedHeartbeats++;
		} else {
			missedHeartbeats = 0;
		}

		if (missedHeartbeats >= 2) {
			self.emit("debug", "Missed 2 heartbeats, reconnecting");
			ws?.terminate();
			return;
		}

		send({
			op: GatewayOpcodes.Heartbeat,
			d: lastSequence ?? null,
		});

		lastHeartbeatSent = Date.now();
	}

	function startHeartbeat(interval: number) {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = undefined;
		}

		const jitter = Math.random();
		const firstDelay = Math.floor(interval * jitter);

		self.emit("debug", `Starting heartbeat (interval=${interval}ms, jitter=${firstDelay}ms)`);

		heartbeatTimeout = setTimeout(() => {
			sendHeartbeat();
			heartbeatInterval = setInterval(sendHeartbeat, interval);
		}, firstDelay);
	}

	function scheduleReconnect(delay = 1000) {
		if (reconnectTimeout) {
			return;
		}

		reconnectTimeout = setTimeout(() => {
			reconnectTimeout = undefined;
			state = ShardState.Idle;
			init();
		}, delay);
	}

	function send(payload: GatewaySendPayload) {
		if (ws?.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(payload));
		}
	}

	return self;
}
