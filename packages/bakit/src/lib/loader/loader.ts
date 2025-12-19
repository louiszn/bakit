// API to communicate with custom loader
// This file is exported as Loader by index.ts
import { register } from "node:module";
import { join, resolve } from "node:path";
import { MessageChannel } from "node:worker_threads";
import { fileURLToPath } from "node:url";

import { Collection } from "discord.js";

import { RPC } from "../RPC.js";

import { HotReloadable } from "@/core/index.js";
import { getEntryDirectory, getEntryFile, getTopLevelDirectory } from "../utils/module.js";

import type { DependencyAdd } from "@/types/loader/message.js";

let hooksRPC: RPC | undefined;
let processRPC: RPC | undefined;

export const hotReloaders = new Collection<string, HotReloadable>();

const reverseDependencyGraph = new Collection<string, Set<string>>();
const forwardDependencyGraph = new Collection<string, Set<string>>();

/**
 * Initliazie the loader
 */
export function init() {
	initProcess();
	initHooks();
}

function initProcess() {
	processRPC = new RPC(process);
	processRPC.on("fileChange", (_, path) => onFileChange(path));
	processRPC.on("fileRemove", (_, path) => onFileRemove(path));
}

function initHooks() {
	const { port1, port2 } = new MessageChannel();

	// This is the only file in loader/ that will be included in index.js
	// hooks.js will also in the same dist directory so this is fine to use
	const hookPath = new URL("./hooks.js", import.meta.url).href;

	register(hookPath, import.meta.url, {
		data: { port: port1 },
		transferList: [port1],
	});

	hooksRPC = new RPC(port2);
	hooksRPC.on("dependencyAdd", (_, data) => onDependencyAdd(data));

	port2.unref();
}

/**
 * Register a reloader for HMR.
 * @param reloader Reloader extended from HotReloadable.
 */
export function addHotReloader(reloader: HotReloadable) {
	hotReloaders.set(reloader.entryDirectory, reloader);
}

/**
 * Remove the previous version of the file.
 * @param path Path to unload.
 * @returns `true` for unloaded successfully, `false` for unload failed.
 */
export function unload(path: string) {
	if (!hooksRPC) {
		throw new Error("Loader isn't initialized");
	}

	return hooksRPC.request<string, boolean>("unload", resolve(path));
}

/**
 * Get a list of the files which imported the target.
 * @param path Target file path to get.
 * @param createNew Create a new Set cache for the target path.
 */
export function getImporters(path: string, createNew?: false): Set<string> | undefined;
export function getImporters(path: string, createNew: true): Set<string>;
export function getImporters(path: string, createNew = false) {
	path = resolve(path);

	let entry = reverseDependencyGraph.get(path);

	if (createNew && !entry) {
		entry = new Set();
		reverseDependencyGraph.set(path, entry);
	}

	return entry;
}

/**
 * Get a list of the files which imported the target.
 * @param path Target file path to get.
 * @param createNew Create a new Set cache for the target path.
 */
export function getImports(path: string) {
	path = resolve(path);

	const imports = [];

	for (const [target, importers] of reverseDependencyGraph) {
		if (importers.has(path)) {
			imports.push(target);
		}
	}

	return imports;
}

/**
 * Get a chain of dependencies for affected files.
 * @param path
 * @returns An array of affected dependencies.
 */
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

		const children = getImports(current);

		for (const child of children) {
			if (visited.has(child)) {
				continue;
			}

			if (importsAny(child, visited)) {
				queue.push(child);
			}
		}
	}

	return Array.from(visited);
}

/**
 * Checks if the target file imports any of the files in the 'targets' set.
 * @param path The file path to check.
 * @param targets The list of the files to check.
 */
export function importsAny(path: string, targets: Set<string>): boolean {
	const imports = getImports(path);
	return imports.some((imp) => targets.has(imp));
}

/**
 * Check if the file is imported by the others.
 * @param path The path of the file to check.
 * @returns `boolean`
 */
export function isImported(path: string) {
	return !!getImporters(path)?.size;
}

/**
 * Check if the file is imported by a specific target.
 * @param path The path of the file to check.
 * @param matcher The target condition to match.
 * @returns `boolean`
 */
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

	let reverseEntry = reverseDependencyGraph.get(path);
	if (!reverseEntry) {
		reverseEntry = new Set();
		reverseDependencyGraph.set(path, reverseEntry);
	}
	reverseEntry.add(parentPath);

	let forwardEntry = forwardDependencyGraph.get(parentPath);
	if (!forwardEntry) {
		forwardEntry = new Set();
		forwardDependencyGraph.set(parentPath, forwardEntry);
	}
	forwardEntry.add(path);
}

/**
 * Check if the file is under a hmr directory.
 * @param path The path of the file to check.
 * @returns `boolean`
 */
export function isInHotDirectory(path: string) {
	const sourceRoot = getEntryDirectory();
	if (!path.startsWith(sourceRoot)) {
		return false;
	}

	const topLevelDir = getTopLevelDirectory(path, sourceRoot);
	if (!topLevelDir) {
		return;
	}

	const entryDirectory = join(sourceRoot, topLevelDir);

	return hotReloaders.some((m) => m.entryDirectory === entryDirectory);
}

/**
 * Check if the file is the entry file (e.g, index.ts)
 * @param path The path of the file to check.
 * @returns `boolean`
 */
export function isEntryFile(path: string) {
	return path === getEntryFile();
}

/**
 * Check if the file chain includes the entry file (e.g, index.ts)
 * @param path The chain of the files to check.
 * @returns `boolean`
 */
export function containsEntryFile(chain: string[]) {
	return chain.some((x) => isEntryFile(x));
}

/**
 * Check if the file chain includes hmr files (e.g, index.ts)
 * @param path The chain of the files to check.
 * @returns `boolean`
 */
export function containsHotModule(chain: string[]) {
	return chain.some((x) => isInHotDirectory(x));
}

/**
 * Request to dev process manager to restart the process.
 */
export function restartProcess() {
	processRPC?.send("restart");
}

async function unloadModule(path: string, reload = false) {
	if (path.includes("/node_modules/")) {
		return;
	}

	const topLevel = getTopLevelDirectory(path, getEntryDirectory());
	if (!topLevel) {
		return;
	}

	const directory = resolve(getEntryDirectory(), topLevel);
	const reloader = hotReloaders.get(directory);

	if (!reloader) {
		await unload(path);
		return;
	}

	reloader[reload ? "reload" : "unload"](path);
}

async function onFileRemove(path: string) {
	if (isEntryFile(path)) {
		restartProcess();
		return;
	}

	if (!isImported(path)) {
		return;
	}

	const chain = getDependencyChain(path);

	if (containsEntryFile(chain)) {
		restartProcess();
		return;
	}

	if (!containsHotModule(chain)) {
		return;
	}

	for (const path of chain.reverse()) {
		await unloadModule(path);
	}
}

async function onFileChange(path: string) {
	if (isEntryFile(path)) {
		restartProcess();
		return;
	}

	if (!isImported(path)) {
		return;
	}

	const chain = getDependencyChain(path);

	if (containsEntryFile(chain)) {
		restartProcess();
		return;
	}

	if (!containsHotModule(chain)) {
		return;
	}

	for (const path of chain.toReversed()) {
		await unloadModule(path, true);
	}
}
