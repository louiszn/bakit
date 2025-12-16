// Handle import and file version for HMR
// JS version locates at dist/hooks.js by tsup
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Module } from "node:module";
import { basename, dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { RPC } from "bakit";

import type {
	InitializeData,
	LoadContext,
	NextLoad,
	NextResolve,
	ResolveContext,
} from "../../types/loader/loaderHooks.js";
import type { DependencyAdd } from "@/types/loader/message.js";

const EXTENSIONS = [".js", ".ts"];

let rpc: RPC;
let versions: Map<string, string>;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let esbuild: typeof import("esbuild") | undefined;

function isDevelopment() {
	return process.env["NODE_ENV"] === "development";
}

export async function initialize({ port }: InitializeData) {
	rpc = new RPC(port);
	versions = new Map();

	rpc.on("unload", onUnload);

	if (isDevelopment()) {
		esbuild = await import("esbuild");
	}
}

export async function resolve(specifier: string, context: ResolveContext, nextResolve: NextResolve) {
	if (shouldSkip(specifier)) {
		return nextResolve(specifier, context);
	}

	let url = specifier;

	const parentURL = context.parentURL?.split("?")[0];
	const baseDir = parentURL ? dirname(fileURLToPath(parentURL)) : process.cwd();

	if (specifier.startsWith(".")) {
		let absPath = resolvePath(baseDir, specifier);

		if (!existsSync(absPath) && absPath.endsWith(".js")) {
			const tsPath = absPath.slice(0, -3) + ".ts";

			if (existsSync(tsPath)) {
				absPath = tsPath;
			}
		}

		url = pathToFileURL(absPath).href;
	}

	const urlObj = new URL(url);

	if (isDevelopment()) {
		const filePath = fileURLToPath(urlObj);

		const version = createVersion(filePath);
		urlObj.searchParams.set("hmr", version);

		if (parentURL) {
			rpc.send<DependencyAdd>("dependencyAdd", {
				parentURL,
				url,
			});
		}
	}

	return {
		url: urlObj.href,
		shortCircuit: true,
		format: "module",
	};
}

export async function load(url: string, context: LoadContext, nextLoad: NextLoad) {
	if (shouldSkip(url)) {
		return nextLoad(url, context);
	}

	try {
		const cleanURL = url.split("?")[0];
		const filePath = fileURLToPath(cleanURL ?? "");

		if (filePath.endsWith(".ts") && esbuild) {
			const raw = await readFile(filePath, "utf8");
			const transformed = await esbuild.transform(raw, {
				platform: "node",
				sourcefile: filePath,
				sourcemap: "inline",
				loader: "ts",
			});

			const source = transformed.code;

			return {
				source,
				format: "module",
				shortCircuit: true,
			};
		}
	} catch {
		/* empty */
	}

	return nextLoad(url, context);
}

function createVersion(filename: string) {
	let version = versions.get(filename);

	if (!version) {
		version = Date.now().toString();
		versions.set(filename, version);
	}

	return version;
}

function shouldSkip(specifier: string) {
	if (Module.isBuiltin(specifier) || specifier.includes("/node_modules/")) {
		return true;
	}

	if (specifier.startsWith(".") || specifier.startsWith("file://")) {
		const filePath = specifier.startsWith("file://") ? fileURLToPath(specifier) : specifier;
		const filename = basename(filePath);
		return !EXTENSIONS.some((ext) => filename.endsWith(ext));
	}

	return true;
}

function onUnload(id: string, path: string) {
	const deleted = versions.delete(resolvePath(path));
	rpc.success(id, deleted);
}
