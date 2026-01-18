import type {
	GatewayDispatchPayload,
	GatewayReadyDispatchData,
	GatewayReceivePayload,
	GatewaySendPayload,
} from "discord-api-types/v10";

export interface WorkerShardRawPayload {
	type: "shardRaw";
	shardId: number;
	payload: GatewayReceivePayload;
}

export interface WorkerShardDispatchPayload {
	type: "shardDispatch";
	shardId: number;
	payload: GatewayDispatchPayload;
}

export interface WorkerShardReadyPayload {
	type: "shardReady";
	shardId: number;
	payload: GatewayReadyDispatchData;
}

export interface WorkerShardDisconnectPayload {
	type: "shardDisconnect";
	shardId: number;
	code: number;
}

export interface WorkerReadyPayload {
	type: "ready";
}

export interface WorkerStopPayload {
	type: "stop";
}

export interface WorkerRequestIdentifyPayload {
	type: "shardRequestIdentify";
	shardId: number;
}

export interface WorkerIdentifyShardPayload {
	type: "identifyShard";
	shardId: number;
}

export interface WorkerBroadcastPayload {
	type: "broadcast";
	payload: GatewaySendPayload;
}

export interface WorkerSendToShardPayload {
	type: "sendToShard";
	shardId: number;
	payload: GatewaySendPayload;
}

export interface WorkerErrorPayload {
	type: "workerError";
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
	| WorkerStopPayload
	| WorkerRequestIdentifyPayload
	| WorkerIdentifyShardPayload
	| WorkerBroadcastPayload
	| WorkerSendToShardPayload;
