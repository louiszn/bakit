import EventEmitter from "node:events";

import { Collection, Queue } from "@bakit/utils";
import { REST, type RESTLike } from "@bakit/rest";

import { ClusterProcess, type EvalResult } from "./cluster/ClusterProcess.js";

import type { Cluster } from "./cluster/Cluster.js";
import type { GatewayDispatchPayload, GatewayReceivePayload, GatewaySendPayload } from "discord-api-types/v10";
import type { APIGatewayBotInfo } from "discord-api-types/v10";

export interface ShardingManagerOptions {
	token: string;
	intents: bigint | number;
	totalShards?: number | "auto";
	shardsPerCluster?: number;
}

export interface ShardingManagerEvents {
	shardAdd: [cluster: ClusterProcess, shardId: number];
	shardReady: [cluster: ClusterProcess, shardId: number];
	shardDisconnect: [cluster: ClusterProcess, shardId: number, code: number];
	shardResume: [cluster: ClusterProcess, shardId: number];
	shardError: [cluster: ClusterProcess, shardId: number, error: Error];

	clusterCreate: [cluster: ClusterProcess];
	clusterReady: [cluster: ClusterProcess];
	clusterExit: [cluster: ClusterProcess, code: number | null];
	clusterError: [cluster: ClusterProcess, error: Error];

	dispatch: [cluster: ClusterProcess, shardId: number, payload: GatewayDispatchPayload];
	raw: [cluster: ClusterProcess, shardId: number, payload: GatewayReceivePayload];

	debug: [message: string];
	ready: [];
}

export class ShardingManager extends EventEmitter<ShardingManagerEvents> {
	public readonly clusters = new Collection<number, ClusterProcess>();
	public readonly options: Required<ShardingManagerOptions>;
	public readonly rest: RESTLike;

	#gatewayInfo?: APIGatewayBotInfo;

	#totalShards = 0;
	#readyCount = 0;
	#identifyQueue: Queue | undefined;

	public constructor(options: ShardingManagerOptions, rest?: RESTLike) {
		super();
		this.setMaxListeners(0);

		this.options = {
			shardsPerCluster: 5,
			totalShards: options.totalShards ?? "auto",
			...options,
		} satisfies Required<ShardingManagerOptions>;

		if (!rest) {
			rest = new REST({ token: this.options.token });
		}

		this.rest = rest;
	}

	public get totalClusters() {
		const { shardsPerCluster } = this.options;

		if (shardsPerCluster <= 0) {
			return 0;
		}

		return Math.ceil(this.totalShards / shardsPerCluster);
	}

	public get totalShards() {
		return this.#totalShards;
	}

	public get ready() {
		return this.#readyCount === this.totalClusters;
	}

	public async spawn(): Promise<void> {
		this.#gatewayInfo = await this.rest.get<APIGatewayBotInfo>("/gateway/bot");

		const { session_start_limit: limit } = this.#gatewayInfo;

		this.#totalShards =
			typeof this.options.totalShards === "number" ? this.options.totalShards : this.#gatewayInfo.shards;

		this.#identifyQueue = new Queue({
			concurrency: limit.max_concurrency,
			intervalCap: limit.max_concurrency,
			interval: 5_000,
		});

		const { totalShards, totalClusters } = this;

		this.emit("debug", `Spawning ${totalClusters} clusters (${totalShards} total shards)...`);

		for (let i = 0; i < totalClusters; i++) {
			this.#spawnCluster(i);
		}

		this.emit("debug", "All clusters spawned");
	}

	public async kill(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
		this.emit("debug", "Shutting down all clusters...");

		const tasks: Promise<void>[] = [];

		for (const cluster of this.clusters.values()) {
			tasks.push(
				new Promise<void>((resolve) => {
					cluster.process.once("exit", () => resolve());
					cluster.kill(signal);
				}),
			);
		}

		await Promise.all(tasks);

		this.emit("debug", "All clusters shut down");
	}

	public broadcast(payload: GatewaySendPayload): void {
		for (const cluster of this.clusters.values()) {
			cluster.send(payload);
		}
	}

	public async broadcastEval<T>(fn: (cluster: Cluster) => T | Promise<T>): Promise<EvalResult<T>[]> {
		const promises = this.clusters.map((cluster) => cluster.eval(fn));
		return Promise.all(promises);
	}

	public send(shardId: number, payload: GatewaySendPayload) {
		const cluster = this.clusters.find((cluster) => cluster.shards.has(shardId));

		if (!cluster) {
			throw new Error(`Shard ${shardId} not found`);
		}

		cluster.send(payload);
	}

	protected requestIdentify(cluster: ClusterProcess, shardId: number): void {
		this.#identifyQueue?.add(() => cluster.identifyShard(shardId));
	}

	#getShardIdsForCluster(clusterId: number): number[] {
		const start = clusterId * this.options.shardsPerCluster;
		const end = Math.min(start + this.options.shardsPerCluster, this.totalShards);

		return Array.from({ length: end - start }, (_, i) => start + i);
	}

	#spawnCluster(id: number) {
		const shardIds = this.#getShardIdsForCluster(id);
		const firstShardId = shardIds[0];
		const lastShardId = shardIds[shardIds.length - 1];

		this.emit("debug", `Spawning cluster ${id} (shards ${firstShardId}-${lastShardId})`);

		const env: NodeJS.ProcessEnv = {
			...process.env,
			BAKIT_CLUSTER_ID: String(id),
			BAKIT_CLUSTER_SHARD_TOTAL: String(this.totalShards),
			BAKIT_CLUSTER_SHARD_LIST: JSON.stringify(shardIds),
			BAKIT_DISCORD_TOKEN: this.options.token,
			BAKIT_DISCORD_INTENTS: String(this.options.intents),
			BAKIT_DISCORD_GATEWAY_URL: this.#gatewayInfo?.url,
			BAKIT_DISCORD_GATEWAY_VERSION: "10",
		};

		const cluster = new ClusterProcess(this, id, { env });

		this.#bindClusterEvents(cluster, id);

		this.clusters.set(id, cluster);
		this.emit("clusterCreate", cluster);
	}

	#bindClusterEvents(cluster: ClusterProcess, id: number): void {
		cluster.on("ready", () => {
			this.#readyCount++;
			this.emit("clusterReady", cluster);

			if (this.ready) {
				this.emit("ready");
			}
		});

		cluster.process.on("exit", (code) => {
			this.emit("clusterExit", cluster, code);

			this.clusters.delete(id);
			this.#readyCount = Math.max(0, this.#readyCount - 1);
		});

		cluster.on("error", (err) => {
			this.emit("clusterError", cluster, err);
		});

		cluster.on("debug", (msg) => {
			this.emit("debug", `[Cluster ${id}] ${msg}`);
		});

		cluster.on("dispatch", (shardId, payload) => {
			this.emit("dispatch", cluster, shardId, payload);
		});

		cluster.on("raw", (shardId, payload) => {
			this.emit("raw", cluster, shardId, payload);
		});

		cluster.on("shardAdd", (shardId) => {
			this.emit("shardAdd", cluster, shardId);
		});

		cluster.on("shardReady", (shardId) => {
			this.emit("shardReady", cluster, shardId);
		});

		cluster.on("shardDisconnect", (shardId, code) => {
			this.emit("shardDisconnect", cluster, shardId, code);
		});

		cluster.on("shardResume", (shardId) => {
			this.emit("shardResume", cluster, shardId);
		});

		cluster.on("shardError", (shardId, error) => {
			this.emit("shardError", cluster, shardId, error);
		});

		cluster.on("needIdentify", (shardId) => {
			this.requestIdentify(cluster, shardId);
		});
	}
}
