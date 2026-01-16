import { WebSocket, type RawData } from "ws";
import { createInflate, type Inflate, constants as zlibConstants } from "node:zlib";

import { attachEventBus, type EventBus } from "@bakit/utils";

import {
	GatewayDispatchEvents,
	GatewayOpcodes,
	type GatewayDispatchPayload,
	type GatewayReceivePayload,
	type GatewaySendPayload,
} from "discord-api-types/gateway";
import type { ValueOf, OptionalKeysOf } from "type-fest";

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
	ready: [];
	disconnect: [code?: number];
	resume: [];

	error: [error: Error];
	debug: [message: string];

	raw: [payload: GatewayReceivePayload];
	dispatch: [payload: GatewayDispatchPayload];
}

export const ShardState = {
	Idle: 0,
	Connecting: 1,
	Ready: 2,
	Resuming: 3,
	Disconnected: 4,
};
export type ShardState = ValueOf<typeof ShardState>;

export interface Shard extends EventBus<ShardEvents> {
	readonly id: number;
	readonly state: ShardState;
	readonly latency: number;

	connect(): void;
	disconnect(code?: number): void;

	send(payload: GatewaySendPayload): void;
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

	let ws: WebSocket | undefined;
	let inflater: Inflate | undefined;

	let shouldReconnect = true;
	let shouldResume = false;
	let resumeGatewayURL: string | undefined;

	let sessionId: string | undefined;
	let reconnectTimeout: NodeJS.Timeout | undefined;

	let lastSequence: number | undefined;

	let heartbeatInterval: NodeJS.Timeout | undefined;
	let lastHeartbeatSent = -1;
	let lastHeartbeatAcknowledged = -1;

	const base = {
		send,
		connect,
		disconnect,

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
		if (state !== ShardState.Idle && state !== ShardState.Disconnected) {
			self.emit("error", new Error("Shard is already connected or connecting."));
			return;
		}

		state = ShardState.Connecting;

		const { gateway } = resolvedOptions;

		const baseURL = shouldResume && resumeGatewayURL ? resumeGatewayURL : gateway.baseURL;
		const url = new URL(baseURL);

		url.searchParams.set("v", gateway.version.toString());
		url.searchParams.set("encoding", "json");
		url.searchParams.set("compress", "zlib-stream");

		ws = new WebSocket(url.toString(), {
			perMessageDeflate: false,
		});

		ws.on("message", onMessage);
		ws.on("close", onClose);
		ws.on("error", (err) => {
			self.emit("error", err);
		});

		inflater = createInflate({
			flush: zlibConstants.Z_SYNC_FLUSH,
		});

		inflater.on("data", (chunk: Buffer) => {
			try {
				const payload = JSON.parse(chunk.toString("utf8"));
				handlePayload(payload);
			} catch (err) {
				self.emit("error", err as Error);
			}
		});

		inflater.on("error", (err) => {
			self.emit("error", err);
			ws?.terminate();
		});
	}

	function cleanup() {
		if (heartbeatInterval) {
			clearInterval(heartbeatInterval);
			heartbeatInterval = undefined;
		}

		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = undefined;
		}

		if (inflater) {
			inflater.destroy();
			inflater = undefined;
		}

		lastHeartbeatSent = -1;
		lastHeartbeatAcknowledged = -1;
	}

	function connect() {
		if (state !== ShardState.Idle && state !== ShardState.Disconnected) {
			return;
		}

		shouldReconnect = true;
		shouldResume = false;

		init();
	}

	function disconnect(code = 1000) {
		shouldResume = false;
		shouldReconnect = false;

		cleanup();
		ws?.close(code);
	}

	function onMessage(data: RawData) {
		if (!(data instanceof Buffer)) return;

		// Safety guard (Discord hard limit ~8MB)
		if (data.length > 8 * 1024 * 1024) {
			ws?.terminate();
			return;
		}

		inflater?.write(data);
	}

	function onClose(code: number) {
		cleanup();

		state = ShardState.Disconnected;
		self.emit("disconnect", code);

		if (shouldReconnect) {
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
				const { heartbeat_interval: duration } = payload.d;

				heartbeatInterval = setInterval(() => {
					if (lastHeartbeatSent !== -1 && lastHeartbeatAcknowledged < lastHeartbeatSent) {
						self.emit("debug", "Heartbeat not acknowledged, reconnecting");
						ws?.terminate();
						return;
					}

					send({
						op: GatewayOpcodes.Heartbeat,
						d: lastSequence ?? null,
					});

					lastHeartbeatSent = Date.now();
				}, duration);

				if (shouldResume && sessionId && lastSequence !== undefined) {
					resume();
				} else {
					identify();
				}

				break;
			}

			case GatewayOpcodes.HeartbeatAck: {
				lastHeartbeatAcknowledged = Date.now();
				break;
			}

			case GatewayOpcodes.InvalidSession: {
				shouldResume = payload.d;

				if (!shouldResume) {
					sessionId = undefined;
					lastSequence = undefined;
					resumeGatewayURL = undefined;
				}

				self.emit("debug", `Invalid session (resumable=${shouldResume})`);

				ws?.terminate();
				break;
			}

			case GatewayOpcodes.Reconnect: {
				shouldResume = true;

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

				self.emit("ready");
				break;
			}

			case GatewayDispatchEvents.Resumed: {
				state = ShardState.Ready;
				shouldResume = false;

				self.emit("resume");
				break;
			}
		}
	}

	function isResumable(): boolean {
		return shouldResume && !!sessionId && lastSequence !== undefined;
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
		if (!isResumable()) {
			return;
		}

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

	function scheduleReconnect(delay = 1000) {
		if (reconnectTimeout) {
			return;
		}

		reconnectTimeout = setTimeout(() => {
			reconnectTimeout = undefined;
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
