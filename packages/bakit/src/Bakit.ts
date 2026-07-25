import { Client, type ClientOptions } from "@bakit/core";

import { Lifecycle, type LifecyclePlugin } from "./lifecycle";

export interface BakitOptions extends ClientOptions {
	plugins?: BakitPluginFactory[];
}

export interface BakitLifecycle {
	start: [];
	stop: [];
}

export type BakitPlugin = LifecyclePlugin<BakitLifecycle>;
export type BakitPluginFactory = (bakit: Bakit) => BakitPlugin;

export class Bakit extends Client {
	readonly #lifecycle = new Lifecycle<BakitLifecycle>();

	constructor(options: BakitOptions) {
		super(options);

		for (const factory of options.plugins ?? []) {
			this.#lifecycle.use(factory(this));
		}
	}

	override async start(): Promise<void> {
		await this.#lifecycle.run("start", async () => {
			await super.start();
		});
	}

	override async stop(): Promise<void> {
		await this.#lifecycle.run("stop", async () => {
			await super.stop();
		});
	}
}

export function useApp(options: BakitOptions) {
	return new Bakit(options);
}
