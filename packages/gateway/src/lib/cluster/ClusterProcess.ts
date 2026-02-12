import EventEmitter from "node:events";
import { fork, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Cluster, ClusterEvents } from "./Cluster.js";
import type { GatewaySendPayload } from "discord-api-types/v10";
import type { ShardingManager } from "../ShardingManager.js";
import { isCommonJS } from "@bakit/utils";

const EVAL_TIMEOUT = 30_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type ClusterIPCDispatchPayload<E extends keyof ClusterEvents = keyof ClusterEvents> = {
	op: "dispatch";
	t: E;
	d: ClusterEvents[E];
};

export interface ClusterIPCIdentifyPayload {
	op: "identify";
	d: number;
}

export interface ClusterIPCGatewaySendPayload {
	op: "send";
	d: {
		shardId?: number;
		data: GatewaySendPayload;
	};
}

export interface ClusterIPCEvalRequestPayload {
	op: "eval";
	d: {
		nonce: string;
		script: string;
	};
}

export interface ClusterIPCEvalResponsePayload {
	op: "evalResponse";
	d: {
		nonce: string;
		success: boolean;
		result: unknown;
		error?: string;
	};
}

export type ClusterIPCPayload =
	| ClusterIPCDispatchPayload
	| ClusterIPCIdentifyPayload
	| ClusterIPCGatewaySendPayload
	| ClusterIPCEvalRequestPayload
	| ClusterIPCEvalResponsePayload;

function isDispatchPayload(payload: ClusterIPCPayload): payload is ClusterIPCDispatchPayload {
	return payload.op === "dispatch";
}

function isIdentifyPayload(payload: ClusterIPCPayload): payload is ClusterIPCIdentifyPayload {
	return payload.op === "identify";
}

function isSendPayload(payload: ClusterIPCPayload): payload is ClusterIPCGatewaySendPayload {
	return payload.op === "send";
}

function isEvalRequestPayload(payload: ClusterIPCPayload): payload is ClusterIPCEvalRequestPayload {
	return payload.op === "eval";
}

function isEvalResponsePayload(payload: ClusterIPCPayload): payload is ClusterIPCEvalResponsePayload {
	return payload.op === "evalResponse";
}

export interface EvalResult<T> {
	/**
	 * Whether the evaluation was successful
	 */
	success: boolean;
	/**
	 * The result of the evaluation if successful
	 */
	data?: T;
	/**
	 * The error if evaluation failed
	 */
	error?: Error;
	/**
	 * The cluster process that executed the evaluation
	 */
	cluster: ClusterProcess;
}

export interface ClusterProcessOptions {
	env?: NodeJS.ProcessEnv;
	execArgv?: string[];
}

export class ClusterProcess extends EventEmitter<ClusterEvents> {
	public readonly process: ChildProcess;

	#pendingEvals = new Map<
		string,
		{
			resolve: (value: EvalResult<unknown>) => void;
			reject: (reason: Error) => void;
			timeout?: NodeJS.Timeout;
		}
	>();
	#shards: Set<number> = new Set();

	public constructor(
		public readonly manager: ShardingManager,
		public readonly id: number,
		options: ClusterProcessOptions = {},
	) {
		super();
		this.setMaxListeners(0);

		const entry = resolve(__dirname, isCommonJS() ? "cluster.cjs" : "cluster.mjs");

		this.process = fork(entry, {
			env: options.env,
			execArgv: options.execArgv,
			stdio: ["inherit", "inherit", "inherit", "ipc"],
		});

		this.#bindProcessEvents();
	}

	public get shards(): Set<number> {
		return new Set(this.#shards);
	}

	public get killed(): boolean {
		return this.process.killed || !this.process.connected;
	}

	public kill(signal: NodeJS.Signals = "SIGTERM"): void {
		if (this.killed) return;

		// Clean up pending evals before killing
		for (const [nonce, pending] of this.#pendingEvals) {
			clearTimeout(pending.timeout);
			pending.reject(new Error(`Process killed before eval completed (nonce: ${nonce})`));
		}
		this.#pendingEvals.clear();

		this.process.kill(signal);
	}

	public async eval<T, C = unknown>(fn: (cluster: Cluster, ctx: C) => T | Promise<T>, ctx?: C): Promise<EvalResult<T>> {
		const nonce = randomUUID();

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				this.#pendingEvals.delete(nonce);
				reject(new Error(`Eval timed out after ${EVAL_TIMEOUT}ms`));
			}, EVAL_TIMEOUT);

			this.#pendingEvals.set(nonce, {
				resolve: resolve as (value: EvalResult<unknown>) => void,
				reject,
				timeout: timeoutId,
			});

			let context: string;

			try {
				context = JSON.stringify(ctx ?? null);
			} catch {
				reject(new Error("Eval context is not serializable"));
				return;
			}

			// Serialize function to string for IPC transmission
			const script = `(${fn.toString()})(cluster, ${context})`;

			this.sendIPC({
				op: "eval",
				d: { nonce, script },
			});
		});
	}

	public send(payload: GatewaySendPayload): void;
	public send(shardId: number, payload: GatewaySendPayload): void;
	public send(idOrPayload: number | GatewaySendPayload, payload?: GatewaySendPayload): void {
		const hasShardId = typeof idOrPayload === "number" && payload !== undefined;
		const shardId = hasShardId ? idOrPayload : undefined;
		const data = hasShardId ? payload : (idOrPayload as GatewaySendPayload);

		this.sendIPC({
			op: "send",
			d: { shardId, data },
		});
	}

	public sendIPC(message: ClusterIPCPayload): void {
		if (!this.process.connected || this.process.killed) {
			return;
		}

		try {
			this.process.send(message, undefined, undefined, (err) => {
				if (err) {
					this.emit("error", err);
				}
			});
		} catch (err) {
			this.emit("error", err as Error);
		}
	}

	public identifyShard(id: number): void {
		this.sendIPC({
			op: "identify",
			d: id,
		});
	}

	#bindProcessEvents(): void {
		this.process.on("message", (message) => this.#handleIPC(message));
		this.process.on("error", (err) => this.emit("error", err));
		this.process.on("disconnect", () => this.emit("debug", "Process disconnected"));
		this.process.on("exit", (code) => {
			// Clean up pending evals on unexpected exit
			for (const [nonce, pending] of this.#pendingEvals) {
				clearTimeout(pending.timeout);
				pending.reject(new Error(`Process exited (code: ${code}) before eval completed (nonce: ${nonce})`));
			}

			this.#pendingEvals.clear();
		});
	}

	#handleIPC(message: unknown): void {
		if (!this.#isValidPayload(message)) {
			return;
		}

		if (isDispatchPayload(message)) {
			this.#handleDispatchPayload(message);
			return;
		}

		if (isEvalResponsePayload(message)) {
			this.#handleEvalResponse(message);
			return;
		}
	}

	#handleDispatchPayload(payload: ClusterIPCDispatchPayload): void {
		if (payload.t === "shardAdd") {
			this.#shards.add((payload.d as number[])[0]!);
		}

		this.emit(payload.t, ...payload.d);
	}

	#handleEvalResponse(payload: ClusterIPCEvalResponsePayload): void {
		const pending = this.#pendingEvals.get(payload.d.nonce);

		if (!pending) {
			this.emit("debug", `Received eval response for unknown nonce: ${payload.d.nonce}`);
			return;
		}

		if (pending.timeout) {
			clearTimeout(pending.timeout);
		}

		this.#pendingEvals.delete(payload.d.nonce);

		if (payload.d.success) {
			pending.resolve({
				success: true,
				data: payload.d.result,
				cluster: this,
			});
		} else {
			const error = new Error(payload.d.error ?? "Unknown eval error");
			pending.resolve({
				success: false,
				error,
				cluster: this,
			});
		}
	}

	#isValidPayload(message: unknown): message is ClusterIPCPayload {
		if (typeof message !== "object" || message === null) {
			return false;
		}

		const payload = message as Record<string, unknown>;

		return (
			payload["op"] === "dispatch" ||
			payload["op"] === "identify" ||
			payload["op"] === "send" ||
			payload["op"] === "eval" ||
			payload["op"] === "evalResponse"
		);
	}

	public static bindProcess(cluster: Cluster): void {
		const superEmit = cluster.emit.bind(cluster);

		const safeSend = (message: ClusterIPCPayload): void => {
			if (!process.connected) {
				return;
			}

			process.send?.(message, undefined, undefined, (err) => {
				if (err) {
					cluster.emit("error", err);
				}
			});
		};

		cluster.emit = function (this: Cluster, eventName, ...args) {
			const result = superEmit(eventName, ...args);

			safeSend({
				op: "dispatch",
				t: eventName as keyof ClusterEvents,
				d: args,
			});

			return result;
		};

		const messageHandler = async (message: ClusterIPCPayload) => {
			if (isIdentifyPayload(message)) {
				const shard = cluster.shards.get(message.d);
				shard?.identify();
				return;
			}

			if (isSendPayload(message)) {
				if (message.d.shardId !== undefined) {
					cluster.send(message.d.shardId, message.d.data);
				} else {
					cluster.send(message.d.data);
				}

				return;
			}

			if (isEvalRequestPayload(message)) {
				await ClusterProcess.#handleEvalRequest(cluster, message, safeSend);
				return;
			}
		};

		process.on("message", messageHandler);
	}

	static async #handleEvalRequest(
		cluster: Cluster,
		payload: ClusterIPCEvalRequestPayload,
		safeSend: (msg: ClusterIPCPayload) => void,
	): Promise<void> {
		const { nonce, script } = payload.d;

		const executeEval = async (): Promise<unknown> => {
			// Create a sandboxed function from the script string
			// 'cluster' is injected as the parameter name
			const fn = new Function("cluster", `return ${script}`);
			return await fn(cluster);
		};

		let timeoutId: NodeJS.Timeout | undefined;

		try {
			const evalPromise = executeEval();

			// Race against execution timeout to prevent infinite hangs
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error(`Eval execution timed out after ${EVAL_TIMEOUT}ms`));
				}, EVAL_TIMEOUT);
			});

			const result = await Promise.race([evalPromise, timeoutPromise]);

			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			safeSend({
				op: "evalResponse",
				d: {
					nonce,
					success: true,
					result,
				},
			});
		} catch (err) {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			safeSend({
				op: "evalResponse",
				d: {
					nonce,
					success: false,
					result: undefined,
					error: err instanceof Error ? err.message : String(err),
				},
			});
		}
	}
}
