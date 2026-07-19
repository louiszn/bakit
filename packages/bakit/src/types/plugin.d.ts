import type { Promisable } from "type-fest";

export interface BakitPlugin {
	onPreStart?(): Promisable<void>;
	onPostStart?(): Promisable<void>;

	onPreStop?(): Promisable<void>;
	onPostStop?(): Promisable<void>;
}

export type BakitPluginFactory = (bakit) => BakitPlugin;
