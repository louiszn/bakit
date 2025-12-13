import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();

const hookPath = new URL("./hooks.js", import.meta.url).href;

register(hookPath, import.meta.url, {
	data: { port: port1 },
	transferList: [port1],
});

export function unload(module: string) {
	port2.postMessage({ type: "unload", target: module });
}
