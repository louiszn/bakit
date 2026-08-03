import { pathToFileURL } from "node:url";

import {
	type BakitPluginFactory,
	ClientEvent,
	type ClientInteractionCreateEvent,
	type ClientMessageCreateEvent,
	type GlobOptions,
	glob,
} from "bakit";

import {
	type CommandPluginFactory,
	type CommandPrefixResolvable,
	CommandRegistry,
} from "../CommandRegistry";
import { Command, CommandTree, type RootCommand } from "../command";

export interface UseCommandsOptions {
	commands?: readonly Command[];
	plugins?: readonly CommandPluginFactory[];

	pattern?: string | readonly string[];
	cwd?: string;
	prefixes?: CommandPrefixResolvable[];
}

async function loadCommands(
	pattern: string | readonly string[],
	options: GlobOptions,
): Promise<RootCommand[]> {
	const files = await glob(pattern, options);

	const modules = await Promise.all(files.map((file) => import(pathToFileURL(file).href)));

	return modules.flatMap((module) =>
		Object.values(module).filter(
			(value): value is RootCommand => value instanceof Command || value instanceof CommandTree,
		),
	);
}

export function useCommands(options: UseCommandsOptions = {}): BakitPluginFactory {
	return (bakit) => {
		const registry = new CommandRegistry(options.prefixes);

		for (const factory of options.plugins ?? []) {
			registry.lifecycle.use(factory(bakit));
		}

		async function handleInteractionCreate(event: ClientInteractionCreateEvent) {
			await registry.handleInteractionCreate(event);
		}

		async function handleMessageCreate(event: ClientMessageCreateEvent) {
			await registry.handleMessageCreate(event);
		}

		return {
			start: {
				async onPre() {
					registry.clear();
					registry.add(...(options.commands ?? []));

					if (options.pattern) {
						const loaded = await loadCommands(options.pattern, {
							cwd: options.cwd,
						});

						registry.add(...loaded);
					}

					bakit.on(ClientEvent.InteractionCreate, handleInteractionCreate);
					bakit.on(ClientEvent.MessageCreate, handleMessageCreate);
				},
			},

			stop: {
				onPre() {
					registry.clear();
					bakit.off(ClientEvent.InteractionCreate, handleInteractionCreate);
					bakit.off(ClientEvent.MessageCreate, handleMessageCreate);
				},
			},
		};
	};
}
