import { Client, type ClientOptions } from "@bakit/core";
import type { BakitPlugin, BakitPluginFactory } from "./types/plugin";

export interface BakitOptions extends ClientOptions {
	plugins?: BakitPluginFactory[];
}

export class Bakit extends Client {
	#plugins: BakitPlugin[] = [];

	constructor(options: BakitOptions) {
		super(options);

		for (const factory of options.plugins ?? []) {
			this.#plugins.push(factory(this));
		}
	}

	override async start(): Promise<void> {
		for (const plugin of this.#plugins) {
			await plugin.onPreStart?.();
		}

		await super.start();

		for (const plugin of this.#plugins) {
			await plugin.onPreStop?.();
		}
	}

	override async stop(): Promise<void> {
		for (const plugin of this.#plugins) {
			await plugin.onPreStart?.();
		}

		await super.stop();

		for (const plugin of this.#plugins) {
			await plugin.onPreStop?.();
		}
	}
}

export function useApp(options: BakitOptions) {
	return new Bakit(options);
}
