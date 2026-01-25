import { attachEventBus, Collection, type EventBus, type ReadonlyCollection } from "@bakit/utils";

import type {
	GatewayDispatchPayload,
	GatewayReadyDispatchData,
	GatewayReceivePayload,
	GatewaySendPayload,
} from "discord-api-types/v10";
import { createShard, ShardState, type Shard } from "./shard.js";
import type { ValueOf } from "type-fest";
import type { WorkerIPCMessage } from "@/types/worker.js";

export interface GatewayWorkerOptions {
	id: number;
	total: number;
	token: string;
	intents: number | bigint;
	shards: number[];
	gatewayURL: string;
}

export interface GatewayWorker extends EventBus<GatewayWorkerEvents> {
	readonly id: number;
	readonly shards: ReadonlyCollection<number, Shard>;
	readonly shardIds: number[];
	readonly latency: number;
	readonly state: GatewayWorkerState;

	start(): Promise<void>;
	stop(code?: number): Promise<void>;

	/**
	 * Broadcast the given payload to all shards connections.
	 * @param {GatewaySendPayload} payload - The payload to send.
	 */
	broadcast(payload: GatewaySendPayload): void;
}

export interface GatewayWorkerEvents {
	ready: [];
	stop: [];
	resume: [];
	degrade: [readyCount: number, total: number];

	shardReady: [shardId: number, payload: GatewayReadyDispatchData];
	shardDisconnect: [shardId: number, code: number];
	shardRaw: [shardId: number, payload: GatewayReceivePayload];
	shardDispatch: [shardId: number, payload: GatewayDispatchPayload];
	shardRequestIdentify: [shardId: number];

	debug: [message: string];
	error: [error: Error];
}

export const GatewayWorkerState = {
	Idle: 0,
	Starting: 1,
	Ready: 2,
	Degraded: 3,
	Stopped: 4,
} as const;
export type GatewayWorkerState = ValueOf<typeof GatewayWorkerState>;

export function createWorker(options: GatewayWorkerOptions): GatewayWorker {
	const shards = new Collection<number, Shard>();

	let state: GatewayWorkerState = GatewayWorkerState.Idle;
	const readyShards = new Set<number>();

	const base = {
		get id() {
			return options.id;
		},
		get shards() {
			return shards;
		},
		get shardIds() {
			return [...options.shards];
		},
		get latency() {
			let count = 0;

			const sumLatency = shards.reduce((acc, shard) => {
				if (shard.latency === -1) {
					return acc;
				}

				count++;
				return acc + shard.latency;
			}, 0);

			return count === 0 ? -1 : sumLatency / count;
		},
		get state() {
			return state;
		},
		start,
		stop,
		broadcast,
	};

	const self: GatewayWorker = attachEventBus<GatewayWorkerEvents, typeof base>(base);

	async function start() {
		if (state !== GatewayWorkerState.Idle && state !== GatewayWorkerState.Stopped) {
			return;
		}

		state = GatewayWorkerState.Starting;

		for (const id of options.shards) {
			const shard = createShard({
				id,
				token: options.token,
				intents: options.intents,
				total: options.total,
				gateway: {
					baseURL: options.gatewayURL,
					version: 10,
				},
			});

			shards.set(id, shard);

			shard.on("ready", (data) => {
				readyShards.add(id);
				self.emit("shardReady", id, data);

				if (state !== GatewayWorkerState.Ready && readyShards.size === options.shards.length) {
					const wasDegraded = state === GatewayWorkerState.Degraded;

					state = GatewayWorkerState.Ready;

					self.emit(wasDegraded ? "resume" : "ready");
				}
			});

			shard.on("disconnect", (code) => {
				readyShards.delete(id);
				self.emit("shardDisconnect", id, code);

				if (state === GatewayWorkerState.Starting) {
					return;
				}

				if (state !== GatewayWorkerState.Degraded && readyShards.size < options.shards.length) {
					state = GatewayWorkerState.Degraded;
					self.emit("degrade", readyShards.size, options.shards.length);
				}
			});

			shard.on("raw", (payload) => self.emit("shardRaw", id, payload));
			shard.on("dispatch", (payload) => self.emit("shardDispatch", id, payload));

			shard.on("error", (err) => self.emit("error", err));
			shard.on("debug", (msg) => self.emit("debug", `[Shard ${id}] ${msg}`));

			shard.on("requestIdentify", () => self.emit("shardRequestIdentify", id));

			shard.connect();
		}
	}

	async function stop(code = 1000) {
		await Promise.all(shards.map((shard) => shard.disconnect(code)));

		state = GatewayWorkerState.Stopped;

		shards.clear();
		readyShards.clear();

		self.emit("stop");
	}

	function broadcast(payload: GatewaySendPayload) {
		for (const shard of shards.values()) {
			if (shard.state === ShardState.Ready) {
				shard.send(payload);
			}
		}
	}

	return self;
}

export function bindWorkerToProcess(worker: GatewayWorker) {
	worker.on("shardRaw", (shardId, payload) => send("shardRaw", { shardId, payload }));
	worker.on("shardDispatch", (shardId, payload) => send("shardDispatch", { shardId, payload }));

	worker.on("shardReady", (shardId, payload) => send("shardReady", { shardId, payload }));
	worker.on("shardDisconnect", (shardId, code) => send("shardDisconnect", { shardId, code }));

	worker.on("shardRequestIdentify", (shardId) => send("shardRequestIdentify", { shardId }));

	worker.on("ready", () => send("ready", {}));
	worker.on("stop", () => send("stop", {}));

	worker.on("error", (error) => {
		send("workerError", {
			error: { message: error.message, stack: error.stack },
		});
	});

	type IPCPayload<T extends WorkerIPCMessage["type"]> = Omit<Extract<WorkerIPCMessage, { type: T }>, "type">;

	function send<T extends WorkerIPCMessage["type"]>(type: T, payload: IPCPayload<T>) {
		if (process.send && process.connected) {
			process.send({ type, ...payload });
		}
	}

	process.on("SIGINT", () => {});
	process.on("SIGTERM", async () => {
		await worker.stop(1000);
		process.exit(0);
	});

	process.on("message", (message: WorkerIPCMessage) => {
		switch (message.type) {
			case "identifyShard": {
				worker.shards.get(message.shardId)?.identify();
				break;
			}

			case "broadcast": {
				worker.broadcast(message.payload);
				break;
			}

			case "sendToShard": {
				worker.shards.get(message.shardId)?.send(message.payload);
				break;
			}
		}
	});
}

export function getWorkerOptions(): GatewayWorkerOptions {
	const { WORKER_DATA } = process.env;

	if (!WORKER_DATA) {
		throw new Error("WORKER_DATA is not set");
	}

	return JSON.parse(WORKER_DATA);
}
