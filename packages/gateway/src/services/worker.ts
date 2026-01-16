import { createWorker, type GatewayWorkerOptions } from "@bakit/gateway";

const options: GatewayWorkerOptions = JSON.parse(process.env["WORKER_DATA"]!);

const worker = createWorker(options);

worker.on("shardRaw", (shardId, payload) => {
	process.send?.({
		type: "shardRaw",
		workerId: options.id,
		shardId,
		payload,
	});
});

worker.on("shardDispatch", (shardId, payload) => {
	process.send?.({
		type: "shardDispatch",
		workerId: options.id,
		shardId,
		payload,
	});
});

worker.on("shardReady", (shardId) => {
	process.send?.({
		type: "shardReady",
		workerId: options.id,
		shardId,
	});
});

worker.on("shardDisconnect", (shardId, code) => {
	process.send?.({
		type: "shardDisconnect",
		workerId: options.id,
		shardId,
		code,
	});
});

worker.on("ready", () => {
	process.send?.({
		type: "ready",
		workerId: options.id,
	});
});

worker.on("stop", () => {
	process.send?.({
		type: "stop",
		workerId: options.id,
	});
});

worker.on("error", onError);

function onError(error: Error) {
	process.send?.({
		type: "workerError",
		workerId: options.id,
		error: {
			message: error.message,
			stack: error.stack,
		},
	});
}

process.on("SIGINT", () => {});
process.on("SIGTERM", () => worker.stop(1000));

await worker.start();
