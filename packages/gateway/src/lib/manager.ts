import { fileURLToPath } from "node:url";
import { ChildProcess, fork } from "node:child_process";

import { type REST } from "@bakit/rest";
import { attachEventBus, Collection, createQueue, type EventBus, type Queue } from "@bakit/utils";

import type { OptionalKeysOf } from "type-fest";
import type {
	APIGatewayBotInfo,
	GatewayDispatchPayload,
	GatewayReadyDispatchData,
	GatewayReceivePayload,
	GatewaySendPayload,
} from "discord-api-types/v10";
import type { GatewayWorkerOptions } from "./worker.js";
import type {
	WorkerBroadcastPayload,
	WorkerIdentifyShardPayload,
	WorkerIPCMessage,
	WorkerSendToShardPayload,
} from "@/types/worker.js";

export const DEFAULT_WORKER_PATH = fileURLToPath(new URL("./services/worker.js", import.meta.url));

export interface GatewayManagerOptions {
	token: string;
	intents: number | bigint;
	workerPath?: string;
	gatewayURL?: string;
	totalShards?: number | "auto";
	shardsPerWorker?: number;
}

export const DEFAULT_GATEWAY_MANAGER_OPTIONS = {
	gatewayURL: "wss://gateway.discord.gg",
	totalShards: "auto",
	shardsPerWorker: 5,
} as const satisfies Pick<GatewayManagerOptions, OptionalKeysOf<GatewayManagerOptions>>;

export interface GatewayManagerEvents {
	error: [error: Error];

	shardReady: [workerId: number, shardId: number, payload: GatewayReadyDispatchData];
	shardDisconnect: [workerId: number, shardId: number, code?: number];
	shardRaw: [workerId: number, shardId: number, payload: GatewayReceivePayload];
	shardDispatch: [workerId: number, shardId: number, payload: GatewayDispatchPayload];

	workerReady: [workerId: number];
	workerStop: [workerId: number];
}

export interface GatewayManager extends EventBus<GatewayManagerEvents> {
	readonly rest: REST;

	spawn(): Promise<void>;
	broadcast(payload: GatewaySendPayload): void;
	sendToWorker(id: number, payload: GatewaySendPayload): void;
	sendToShard(id: number, payload: GatewaySendPayload): void;
}

export function createGatewayManager(options: GatewayManagerOptions, rest: REST): GatewayManager {
	const opts = {
		...DEFAULT_GATEWAY_MANAGER_OPTIONS,
		...options,
	};

	let identifyQueue: Queue | undefined;

	const workers = new Collection<number, ChildProcess>();

	const base = {
		get rest() {
			return rest;
		},

		spawn,
		broadcast,
		sendToWorker,
		sendToShard,
	};

	const self = attachEventBus<GatewayManagerEvents, typeof base>(base);

	async function spawn() {
		const gatewayBotInfo = await rest!.get<APIGatewayBotInfo>("/gateway/bot");
		const { session_start_limit: limit } = gatewayBotInfo;

		const totalShards = opts.totalShards === "auto" ? gatewayBotInfo.shards : opts.totalShards;
		const totalWorkers = Math.ceil(totalShards / opts.shardsPerWorker);

		if (limit.remaining < totalShards) {
			const error = new Error(
				[
					"Not enough remaining gateway sessions to spawn shards.",
					`Required: ${totalShards}`,
					`Remaining: ${limit.remaining}`,
					`Resets in: ${Math.ceil(limit.reset_after / 1000)}s`,
				].join(" "),
			);

			self.emit("error", error);
			return;
		}

		if (identifyQueue) {
			identifyQueue.pause();
			identifyQueue = undefined;
		}

		identifyQueue = createQueue({
			concurrency: limit.max_concurrency,
			intervalCap: limit.max_concurrency,
			interval: 5_000,
		});

		for (let i = 0; i < totalWorkers; i++) {
			const start = i * opts.shardsPerWorker;
			const shards = Array.from({ length: Math.min(opts.shardsPerWorker, totalShards - start) }, (_, j) => start + j);

			const workerOptions: GatewayWorkerOptions = {
				id: i,
				total: totalShards,
				token: options.token,
				intents: options.intents,
				shards: shards,
				gatewayURL: opts.gatewayURL ?? "wss://gateway.discord.gg",
			};

			workers.set(i, spawnWorker(workerOptions));
		}
	}

	async function shutdown(signal: string) {
		console.log(`Received ${signal}, shutting down...`);

		await Promise.all(
			[...workers.values()].map((child) => {
				return new Promise<void>((resolve) => {
					child.once("exit", () => resolve());
					child.kill("SIGTERM");
				});
			}),
		);

		process.exit(0);
	}

	process.once("SIGINT", shutdown);
	process.once("SIGTERM", shutdown);

	function spawnWorker(payload: GatewayWorkerOptions) {
		const child = fork(opts.workerPath ?? DEFAULT_WORKER_PATH, [], {
			env: {
				WORKER_DATA: JSON.stringify(payload),
			},
			stdio: "inherit",
		});

		child.on("message", (msg: WorkerIPCMessage) => {
			switch (msg.type) {
				case "shardRaw": {
					self.emit("shardRaw", payload.id, msg.shardId, msg.payload);
					break;
				}

				case "shardDispatch": {
					self.emit("shardDispatch", payload.id, msg.shardId, msg.payload);
					break;
				}

				case "shardReady": {
					self.emit("shardReady", payload.id, msg.shardId, msg.payload);
					break;
				}

				case "shardDisconnect": {
					self.emit("shardDisconnect", payload.id, msg.shardId, msg.code);
					break;
				}

				case "shardRequestIdentify": {
					identifyQueue?.add(async () => {
						if (!child.connected) {
							return;
						}

						child.send({
							type: "identifyShard",
							shardId: msg.shardId,
						} satisfies WorkerIdentifyShardPayload);
					});

					break;
				}

				case "ready": {
					self.emit("workerReady", payload.id);
					break;
				}

				case "stop": {
					self.emit("workerStop", payload.id);
					break;
				}

				case "workerError": {
					self.emit("error", new Error(`[worker ${payload.id}] ${msg.error.message}`));
					break;
				}
			}
		});

		return child;
	}

	function broadcast(payload: GatewaySendPayload) {
		for (const child of workers.values()) {
			if (!child.connected) {
				continue;
			}

			child.send({
				type: "broadcast",
				payload,
			} satisfies WorkerBroadcastPayload);
		}
	}

	function sendToShard(shardId: number, payload: GatewaySendPayload): boolean {
		const workerId = Math.floor(shardId / opts.shardsPerWorker);
		const child = workers.get(workerId);

		if (!child?.connected) {
			return false;
		}

		child.send({
			type: "sendToShard",
			shardId,
			payload,
		} satisfies WorkerSendToShardPayload);

		return true;
	}

	function sendToWorker(workerId: number, payload: GatewaySendPayload): boolean {
		const child = workers.get(workerId);

		if (!child?.connected) {
			return false;
		}

		child.send({
			type: "broadcast",
			payload,
		} satisfies WorkerBroadcastPayload);

		return true;
	}

	return self;
}
