import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();

const hookPath = pathToFileURL(resolve("./loader.js")).href;

register(hookPath, import.meta.url, {
	data: { port: port1 },
	transferList: [port1],
});

export function unload(module: string) {
	port2.postMessage({ type: "unload", target: module });
}
