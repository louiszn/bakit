import { fileURLToPath } from "node:url";
import { ChildProcess, fork } from "node:child_process";

import { type REST, type RESTOptions, createREST } from "@bakit/rest";
import { attachEventBus, Collection, type EventBus } from "@bakit/utils";

import type { OptionalKeysOf } from "type-fest";
import type {
	APIGatewayBotInfo,
	GatewayDispatchPayload,
	GatewayReadyDispatchData,
	GatewayReceivePayload,
} from "discord-api-types/v10";
import type { GatewayWorkerOptions } from "./worker.js";
import type { WorkerIPCMessage } from "@/types/worker.js";

const WORKER_PATH = fileURLToPath(new URL("./services/worker.js", import.meta.url));

export interface GatewayManagerOptions {
	token: string;
	intents: number | bigint;
	gatewayURL?: string;
	totalShards?: number | "auto";
	shardsPerWorker?: number;
	rest?: RESTOptions;
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
}

export function createGatewayManager(options: GatewayManagerOptions): GatewayManager {
	const opts = {
		...DEFAULT_GATEWAY_MANAGER_OPTIONS,
		...options,
	};

	const workers = new Collection<number, ChildProcess>();
	const rest = createREST(opts.rest ?? { token: options.token });

	const base = {
		get rest() {
			return rest;
		},

		spawn,
	};

	const self = attachEventBus<GatewayManagerEvents, typeof base>(base);

	async function spawn() {
		const gatewayBotInfo = await rest.get<APIGatewayBotInfo>("/gateway/bot");

		const totalShards = opts.totalShards === "auto" ? gatewayBotInfo.shards : opts.totalShards;
		const totalWorkers = Math.ceil(totalShards / opts.shardsPerWorker);

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
				new Promise<void>((resolve) => {
					child.once("exit", () => resolve());
					child.kill("SIGTERM");
				});
			}),
		);
	}

	process.once("SIGINT", shutdown);
	process.once("SIGTERM", shutdown);

	function spawnWorker(payload: GatewayWorkerOptions) {
		const child = fork(WORKER_PATH, [], {
			env: {
				WORKER_DATA: JSON.stringify(payload),
			},
			stdio: "inherit",
		});

		child.on("message", (msg: WorkerIPCMessage) => {
			switch (msg.type) {
				case "shardRaw": {
					self.emit("shardRaw", msg.workerId, msg.shardId, msg.payload);
					break;
				}

				case "shardDispatch": {
					self.emit("shardDispatch", msg.workerId, msg.shardId, msg.payload);
					break;
				}

				case "shardReady": {
					self.emit("shardReady", msg.workerId, msg.shardId, msg.payload);
					break;
				}

				case "shardDisconnect": {
					self.emit("shardDisconnect", msg.workerId, msg.shardId, msg.code);
					break;
				}

				case "ready": {
					self.emit("workerReady", msg.workerId);
					break;
				}

				case "stop": {
					self.emit("workerStop", msg.workerId);
					break;
				}

				case "workerError": {
					self.emit("error", new Error(`[worker ${msg.workerId}] ${msg.error.message}`));
					break;
				}
			}
		});

		return child;
	}

	return self;
}
