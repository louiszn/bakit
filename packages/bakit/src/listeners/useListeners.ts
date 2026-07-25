import { pathToFileURL } from "node:url";

import type { ClientEvent } from "@bakit/core";

import type { Bakit, BakitPluginFactory } from "#/Bakit";
import { type Dispose, Lifecycle, type LifecyclePlugin } from "#/lifecycle";
import { type GlobOptions, glob } from "#/utils";

import { Listener, type ListenerHandler } from "./Listener";

type AnyListener = Listener<ClientEvent>;
type AnyListenerHandler = ListenerHandler<ClientEvent>;

export interface ListenerInvocation {
	event: ClientEvent;
	listener: AnyListener;
	args: readonly unknown[];
}

export interface ListenersLifecycle {
	invoke: [invocation: ListenerInvocation];
}

export type ListenerPlugin = LifecyclePlugin<ListenersLifecycle>;
export type ListenerPluginFactory = (bakit: Bakit) => ListenerPlugin;

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

function createHandler(
	listener: AnyListener,
	lifecycle: Lifecycle<ListenersLifecycle>,
): AnyListenerHandler {
	return async (...args) => {
		const invocation: ListenerInvocation = {
			event: listener.event,
			listener,
			args,
		};

		await lifecycle.run("invoke", () => listener.execute(...(args as never)), invocation);
	};
}

function subscribe(
	bakit: Bakit,
	listener: AnyListener,
	lifecycle: Lifecycle<ListenersLifecycle>,
): Dispose {
	const handler = createHandler(listener, lifecycle);

	bakit.on(listener.event, handler);

	return () => bakit.off(listener.event, handler);
}

export function useListeners(options: UseListenersOptions = {}): BakitPluginFactory {
	return (bakit) => {
		const listeners = new Set<AnyListener>(options.listeners ?? []);

		const lifecycle = new Lifecycle<ListenersLifecycle>();
		const subscriptions: Dispose[] = [];

		for (const factory of options.plugins ?? []) {
			lifecycle.use(factory(bakit));
		}

		function unsubscribeAll(): void {
			while (subscriptions.length > 0) {
				subscriptions.pop()?.();
			}
		}

		return {
			start: {
				async onPre() {
					if (options.pattern) {
						const loaded = await loadListeners(options.pattern, {
							cwd: options.cwd,
						});

						for (const listener of loaded) {
							listeners.add(listener);
						}
					}

					unsubscribeAll();

					for (const listener of listeners) {
						subscriptions.push(subscribe(bakit, listener, lifecycle));
					}
				},
			},

			stop: {
				onPre() {
					unsubscribeAll();
				},
			},
		};
	};
}
