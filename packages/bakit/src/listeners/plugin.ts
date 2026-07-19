import type { ClientEvent, ClientEvents } from "@bakit/core";
import { pathToFileURL } from "bun";
import glob from "tiny-glob";
import type { Promisable } from "type-fest";
import type { BakitPluginFactory } from "../types/plugin";
import { Listener } from "./Listener";

export interface UseListenersOptions {
	listeners?: readonly Listener<ClientEvent>[];
	plugins?: readonly ListenerPlugin[];

	pattern?: string | readonly string[];
	cwd?: string;
}

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
	const patterns = options.pattern
		? Array.isArray(options.pattern)
			? options.pattern
			: [options.pattern]
		: [];

	const plugins = options.plugins ?? [];
	const cwd = options.cwd ?? process.cwd();

	return (bakit) => {
		const listeners = [...(options.listeners ?? [])];
		const handlers = new Map<Listener<ClientEvent>, (...args: never[]) => Promise<void>>();

		return {
			async onPreStart() {
				listeners.push(...(await loadListeners(patterns, cwd)));

				for (const listener of listeners) {
					const handler = async (...args: unknown[]) => {
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
