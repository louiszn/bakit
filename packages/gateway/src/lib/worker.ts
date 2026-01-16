import { attachEventBus, Collection, type EventBus, type ReadonlyCollection } from "@bakit/utils";

import type { GatewaySendPayload } from "discord-api-types/v10";
import { createShard, ShardState, type Shard } from "./shard.js";
import type { ValueOf } from "type-fest";

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

	shardReady: [shardId: number];
	shardDisconnect: [shardId: number, code?: number];

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

			shard.on("ready", () => {
				readyShards.add(id);
				self.emit("shardReady", id);

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

			shard.on("error", (err) => self.emit("error", err));
			shard.on("debug", (msg) => self.emit("debug", `[Shard ${id}] ${msg}`));

			shard.connect();
		}
	}

	async function stop(code = 1000) {
		await Promise.allSettled(shards.map((shard) => shard.disconnect(code)));

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
