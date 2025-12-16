import { register } from "node:module";
import { resolve } from "node:path";
import { MessageChannel } from "node:worker_threads";

import { RPC } from "../RPC.js";
import type { DependencyAdd } from "@/types/loader/message.js";
import { fileURLToPath } from "node:url";

let rpc: RPC | undefined;

const reverseDependencyGraph = new Map<string, Set<string>>();

export function $initLoader() {
	const { port1, port2 } = new MessageChannel();

	// This is the only file in loader/ that will be included in index.js
	// hooks.js will also in the same dist directory so this is fine to use
	const hookPath = new URL("./hooks.js", import.meta.url).href;

	register(hookPath, import.meta.url, {
		data: { port: port1 },
		transferList: [port1],
	});

	rpc = new RPC(port2);
	rpc.on("dependencyAdd", (_id, data) => onDependencyAdd(data));

	port2.unref();
}

export function $unloadFile(path: string) {
	if (!rpc) {
		throw new Error("Loader isn't initialized");
	}

	return rpc.request<string, boolean>("unload", resolve(path));
}

export function isImported(filePath: string) {
	return !!reverseDependencyGraph.get(filePath)?.size;
}

export function isImportedBy(filePath: string, matcher: string | RegExp | ((path: string) => boolean)): boolean {
	const queue: string[] = [filePath];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const current = queue.shift()!;

		if (visited.has(current)) {
			continue;
		}

		visited.add(current);

		const parents = reverseDependencyGraph.get(current);

		if (!parents) {
			continue;
		}

		for (const parent of parents) {
			let isMatch = false;

			if (typeof matcher === "string") {
				isMatch = parent === matcher;
			} else if (matcher instanceof RegExp) {
				isMatch = matcher.test(parent);
			} else if (typeof matcher === "function") {
				isMatch = matcher(parent);
			}

			if (isMatch) {
				return true;
			}

			if (!visited.has(parent)) {
				queue.push(parent);
			}
		}
	}

	return false;
}

function onDependencyAdd(data: DependencyAdd) {
	const { url, parentURL } = data;

	const path = fileURLToPath(url);
	const parentPath = fileURLToPath(parentURL);

	let entry = reverseDependencyGraph.get(path);

	if (!entry) {
		entry = new Set();
		reverseDependencyGraph.set(path, entry);
	}

	entry.add(parentPath);
}
