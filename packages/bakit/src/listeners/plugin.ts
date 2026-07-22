import type { ClientEvent, ClientEvents } from "@bakit/core";
import { pathToFileURL } from "bun";
import glob from "tiny-glob";
import type { Promisable } from "type-fest";

import type { BakitPluginFactory } from "../types/plugin";
import { Listener } from "./Listener";

type AnyListener = Listener<ClientEvent>;
type ListenerHandler = (...args: unknown[]) => Promise<void>;

export interface ListenerPlugin {
	onPre?<TEvent extends ClientEvent>(
		listener: Listener<TEvent>,
		...args: ClientEvents[TEvent]
	): Promisable<void>;

	onPost?<TEvent extends ClientEvent>(
		listener: Listener<TEvent>,
		...args: ClientEvents[TEvent]
	): Promisable<void>;
}

export interface UseListenersOptions {
	listeners?: readonly AnyListener[];
	plugins?: readonly ListenerPlugin[];

	pattern?: string | readonly string[];
	cwd?: string;
}

function normalizePatterns(pattern?: string | readonly string[]): readonly string[] {
	if (!pattern) {
		return [];
	}

	return Array.isArray(pattern) ? pattern : [pattern as string];
}

async function loadListeners(patterns: readonly string[], cwd: string): Promise<AnyListener[]> {
	const matches = await Promise.all(
		patterns.map((pattern) =>
			glob(pattern, {
				cwd,
				absolute: true,
			}),
		),
	);

	const files = [...new Set(matches.flat())];

	const modules = await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

	return modules.flatMap((module) =>
		Object.values(module).filter((value): value is AnyListener => value instanceof Listener),
	);
}

function createHandler(listener: AnyListener, plugins: readonly ListenerPlugin[]): ListenerHandler {
	return async (...args) => {
		for (const plugin of plugins) {
			await plugin.onPre?.(listener, ...(args as never));
		}

		await listener.onPre?.(...(args as never));
		await listener.onMain(...(args as never));
		await listener.onPost?.(...(args as never));

		for (const plugin of plugins.toReversed()) {
			await plugin.onPost?.(listener, ...(args as never));
		}
	};
}

export function useListeners(options: UseListenersOptions = {}): BakitPluginFactory {
	const patterns = normalizePatterns(options.pattern);
	const plugins = options.plugins ?? [];
	const cwd = options.cwd ?? process.cwd();

	return (bakit) => {
		const listeners = new Set(options.listeners ?? []);
		const handlers = new Map<AnyListener, ListenerHandler>();

		return {
			async onPreStart() {
				for (const listener of await loadListeners(patterns, cwd)) {
					listeners.add(listener);
				}

				for (const listener of listeners) {
					const handler = createHandler(listener, plugins);

					handlers.set(listener, handler);
					bakit.on(listener.event, handler);
				}
			},

			onPreStop() {
				for (const [listener, handler] of handlers) {
					bakit.off(listener.event, handler);
				}

				handlers.clear();
			},
		};
	};
}
