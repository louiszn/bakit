import type { GatewayDispatchPayload, GatewayReceivePayload } from "discord-api-types/v10";

export interface WorkerShardRawPayload {
	type: "shardRaw";
	workerId: number;
	shardId: number;
	payload: GatewayReceivePayload;
}

export interface WorkerShardDispatchPayload {
	type: "shardDispatch";
	workerId: number;
	shardId: number;
	payload: GatewayDispatchPayload;
}

export interface WorkerShardReadyPayload {
	type: "shardReady";
	workerId: number;
	shardId: number;
}

export interface WorkerShardDisconnectPayload {
	type: "shardDisconnect";
	workerId: number;
	shardId: number;
	code: number;
}

export interface WorkerReadyPayload {
	type: "ready";
	workerId: number;
}

export interface WorkerStopPayload {
	type: "stop";
	workerId: number;
}

export interface WorkerErrorPayload {
	type: "workerError";
	workerId: number;
	error: {
		message: string;
		stack?: string;
	};
}

export type WorkerIPCMessage =
	| WorkerShardRawPayload
	| WorkerShardDispatchPayload
	| WorkerShardReadyPayload
	| WorkerShardDisconnectPayload
	| WorkerErrorPayload
	| WorkerReadyPayload
	| WorkerStopPayload;
