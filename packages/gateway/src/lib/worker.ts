import { attachEventBus, Collection, type EventBus, type ReadonlyCollection } from "@bakit/utils";

import type { GatewaySendPayload } from "discord-api-types/v10";
import { createShard, type Shard } from "./shard.js";

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
	readonly ready: boolean;

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
	shardReady: [shardId: number];
	shardDisconnect: [shardId: number, code?: number];

	debug: [message: string];
	error: [error: Error];
}

export function createWorker(options: GatewayWorkerOptions): GatewayWorker {
	const shards = new Collection<number, Shard>();

	let ready = false;
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
		get ready() {
			return ready;
		},
		start,
		stop,
		broadcast,
	};

	const self: GatewayWorker = attachEventBus<GatewayWorkerEvents, typeof base>(base);

	async function start() {
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

				if (!ready && readyShards.size === options.shards.length) {
					ready = true;
					self.emit("ready");
				}
			});

			shard.on("disconnect", (code) => self.emit("shardDisconnect", id, code));
			shard.on("error", (err) => self.emit("error", err));
			shard.on("debug", (msg) => self.emit("debug", `[Shard ${id}] ${msg}`));

			shard.connect();
		}
	}

	async function stop(code = 1000) {
		ready = false;
		await Promise.allSettled(shards.map((shard) => shard.disconnect(code)));
		shards.clear();
	}

	function broadcast(payload: GatewaySendPayload) {
		for (const shard of shards.values()) {
			shard.send(payload);
		}
	}

	return self;
}
