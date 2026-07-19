import type { ClientEvent } from "@bakit/core";
import { pathToFileURL } from "bun";
import glob from "tiny-glob";

import type { BakitPluginFactory } from "../types/plugin";
import { Listener } from "./Listener";

export interface UseListenersOptions {
	listeners?: readonly Listener<ClientEvent>[];
	pattern?: string | readonly string[];
	cwd?: string;
}

async function loadListeners(patterns: readonly string[], cwd: string) {
	const files = new Set(
		(
			await Promise.all(
				patterns.map((pattern) =>
					glob(pattern, {
						cwd,
						absolute: true,
					}),
				),
			)
		).flat(),
	);

	const modules = await Promise.all([...files].map((file) => import(pathToFileURL(file).href)));

	return modules.flatMap((module) =>
		Object.values(module).filter(
			(value): value is Listener<ClientEvent> => value instanceof Listener,
		),
	);
}

export function useListeners(options: UseListenersOptions = {}): BakitPluginFactory {
	const patterns: string[] = options.pattern
		? Array.isArray(options.pattern)
			? options.pattern
			: [options.pattern]
		: [];

	const cwd = options.cwd ?? process.cwd();

	return (bakit) => {
		const listeners = [...(options.listeners ?? [])];

		return {
			async onPreStart() {
				listeners.push(...(await loadListeners(patterns, cwd)));

				for (const listener of listeners) {
					listener.attach(bakit);
				}
			},

			onPreStop() {
				for (const listener of listeners) {
					listener.detach(bakit);
				}
			},
		};
	};
}
