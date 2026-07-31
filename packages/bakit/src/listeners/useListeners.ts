import { pathToFileURL } from "node:url";

import type { BakitPluginFactory } from "#/Bakit";
import { type GlobOptions, glob } from "#/utils";

import { type AnyListener, Listener } from "./Listener";
import { type ListenerPluginFactory, ListenerRegistry } from "./ListenerRegistry";

export interface UseListenersOptions {
	listeners?: readonly AnyListener[];
	plugins?: readonly ListenerPluginFactory[];

	pattern?: string | readonly string[];
	cwd?: string;
}

async function loadListeners(
	pattern: string | readonly string[],
	options: GlobOptions,
): Promise<AnyListener[]> {
	const files = await glob(pattern, options);

	const modules = await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

	return modules.flatMap((module) =>
		Object.values(module).filter((value): value is AnyListener => value instanceof Listener),
	);
}

export function useListeners(options: UseListenersOptions = {}): BakitPluginFactory {
	return (bakit) => {
		const listeners = new ListenerRegistry(bakit);

		for (const factory of options.plugins ?? []) {
			listeners.lifecycle.use(factory(bakit));
		}

		return {
			start: {
				async onPre() {
					listeners.unsubscribeAll();

					for (const listener of options.listeners ?? []) {
						listeners.subscribe(listener);
					}

					if (options.pattern) {
						const loaded = await loadListeners(options.pattern, {
							cwd: options.cwd,
						});

						for (const listener of loaded) {
							listeners.subscribe(listener);
						}
					}
				},
			},

			stop: {
				onPre() {
					listeners.unsubscribeAll();
				},
			},
		};
	};
}
