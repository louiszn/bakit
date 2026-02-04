import EventEmitter from "node:events";
import { Collection } from "@bakit/utils";

import { Shard, type ShardOptions } from "../Shard.js";

import type { GatewayDispatchPayload, GatewayReadyDispatchData, GatewaySendPayload } from "discord-api-types/v10";

export interface ClusterEvents {
	shardAdd: [id: number];
	shardReady: [id: number, data: GatewayReadyDispatchData];
	shardDisconnect: [id: number, code: number];
	shardResume: [id: number];
	shardError: [id: number, error: Error];
	needIdentify: [id: number];

	debug: [message: string];

	dispatch: [id: number, payload: GatewayDispatchPayload];
	ready: [];
	error: [error: Error];
}

export class Cluster extends EventEmitter<ClusterEvents> {
	public readonly shards = new Collection<number, Shard>();

	#readyCount = 0;
	#starting = false;

	public constructor(
		public readonly id: number,
		public readonly options: ShardOptions,
	) {
		super();
	}

	public get size() {
		return this.shards.size;
	}

	public get ready() {
		return this.#readyCount === this.options.total;
	}

	public async spawn(): Promise<void> {
		if (this.#starting) {
			return;
		}

		this.#starting = true;

		this.emit("debug", `Spawning ${this.options.total} shards...`);

		for (let i = 0; i < this.options.total; i++) {
			await this.#spawnShard(i);
		}

		this.emit("debug", "All shards spawned");
	}

	public async shutdown(code = 1000) {
		this.emit("debug", "Shutting down cluster...");

		const tasks: Promise<void>[] = [];

		for (const shard of this.shards.values()) {
			tasks.push(shard.disconnect(code));
		}

		await Promise.allSettled(tasks);

		this.emit("debug", "Cluster shutdown complete");
	}

	public broadcast(fn: (shard: Shard) => void) {
		for (const shard of this.shards.values()) {
			fn(shard);
		}
	}

	public send(payload: GatewaySendPayload): void;
	public send(shardId: number, payload: GatewaySendPayload): void;
	public send(idOrPayload: number | GatewaySendPayload, payload?: GatewaySendPayload): void {
		const hasId = typeof idOrPayload === "number" && payload !== undefined;

		const shardId: number | undefined = hasId ? idOrPayload : undefined;
		const data: GatewaySendPayload = hasId ? payload : (idOrPayload as GatewaySendPayload);

		if (shardId !== undefined) {
			this.shards.get(shardId)?.send(data);
		} else {
			this.broadcast((shard) => shard.send(data));
		}
	}

	async #spawnShard(id: number) {
		const shard = new Shard(id, this.options);

		this.#bindShardEvents(shard);

		this.shards.set(id, shard);
		this.emit("shardAdd", id);

		await shard.connect();
	}

	#bindShardEvents(shard: Shard) {
		const id = shard.id;

		shard.on("ready", (data) => {
			this.#readyCount++;

			this.emit("debug", `Shard ${id} ready`);

			this.emit("shardReady", id, data);

			if (this.ready) {
				this.emit("ready");
			}
		});

		shard.on("resume", () => {
			this.emit("debug", `Shard ${id} resumed`);
			this.emit("shardResume", id);
		});

		shard.on("disconnect", (code) => {
			this.emit("debug", `Shard ${id} disconnected (${code})`);

			this.emit("shardDisconnect", id, code);
		});

		shard.on("error", (err) => {
			this.emit("debug", `Shard ${id} error: ${err.message}`);
			this.emit("shardError", id, err);
		});

		shard.on("dispatch", (payload) => {
			this.emit("dispatch", id, payload);
		});

		shard.on("needIdentify", async () => {
			this.emit("needIdentify", id);
		});

		shard.on("debug", (msg) => {
			this.emit("debug", `[Shard ${id}] ${msg}`);
		});
	}
}
