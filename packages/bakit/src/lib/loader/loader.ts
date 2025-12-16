import { register } from "node:module";
import { resolve } from "node:path";
import { MessageChannel } from "node:worker_threads";
import { fileURLToPath } from "node:url";

import { RPC } from "../RPC.js";

import type { DependencyAdd } from "@/types/loader/message.js";

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

export function getImporters(path: string, createNew: true): Set<string>;
export function getImporters(path: string, createNew?: false): Set<string> | undefined;
export function getImporters(path: string, createNew = false) {
	path = resolve(path);

	let entry = reverseDependencyGraph.get(path);

	if (createNew && !entry) {
		entry = new Set();
		reverseDependencyGraph.set(path, entry);
	}

	return entry;
}

export function getDependencyChain(path: string): string[] {
	path = resolve(path);

	const queue: string[] = [path];
	const visited = new Set<string>();

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) {
			continue;
		}

		if (visited.has(current)) {
			continue;
		}
		visited.add(current);

		if (current.includes("/node_modules/")) {
			continue;
		}

		const parents = getImporters(current);
		if (!parents) {
			continue;
		}

		for (const parent of parents) {
			if (!visited.has(parent)) {
				queue.push(parent);
			}
		}
	}

	return Array.from(visited);
}

export function isImported(path: string) {
	return !!getImporters(path)?.size;
}

export function isImportedBy(path: string, matcher: string | RegExp | ((path: string) => boolean)): boolean {
	const chain = getDependencyChain(path).slice(1);

	return chain.some((p) => {
		let isMatch = false;

		if (typeof matcher === "string") {
			isMatch = resolve(matcher) === p;
		}
		if (typeof matcher === "function") {
			isMatch = matcher(p);
		}
		if (matcher instanceof RegExp) {
			isMatch = matcher.test(p);
		}

		return isMatch;
	});
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
