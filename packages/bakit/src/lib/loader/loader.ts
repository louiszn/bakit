import { register } from "node:module";
import { resolve } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";

export interface PostMessage<Data> {
	id: number;
	type: string;
	data: Data;
}

export interface ResponseMessage<Data> {
	id: number;
	error?: string;
	data?: Data;
}

let port1: MessagePort | undefined;
let port2: MessagePort | undefined;

let messageId = 0;

const pending = new Map<
	number,
	{
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		resolve: (value?: any) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		reject: (error?: any) => void;
	}
>();

export function $initLoader() {
	const channel = new MessageChannel();

	port1 = channel.port1;
	port2 = channel.port2;

	const hookPath = new URL("./hooks.js", import.meta.url).href;

	register(hookPath, import.meta.url, {
		data: { port: port1 },
		transferList: [port1],
	});

	port2.on("message", onMessage);

	port2.unref();
}

function onMessage(message: ResponseMessage<unknown>) {
	const { id, error, data } = message;
	const request = pending.get(id);

	if (!request) {
		return;
	}

	pending.delete(id);

	if (error) {
		request.reject(new Error(error));
	} else {
		request.resolve(data);
	}
}

export function $postLoaderMessage<Data>(type: string, data: Data, wait?: false): void;
export function $postLoaderMessage<Data, Output = unknown>(type: string, data: Data, wait: true): Promise<Output>;
export function $postLoaderMessage<Data, Output = unknown>(
	type: string,
	data: Data,
	wait = false,
): Promise<Output> | void {
	const id = messageId++;
	const message: PostMessage<Data> = { id, type, data };

	if (!wait) {
		port2?.postMessage(message);
		return;
	}

	return new Promise((resolve, reject) => {
		if (!port2) {
			return reject(new Error("Loader is not initialized"));
		}

		pending.set(id, { resolve, reject });
		port2.postMessage(message);
	});
}

export function $unloadFile(path: string) {
	return $postLoaderMessage<string, boolean>("unload", resolve(path), true);
}
