import type { Snowflake } from "discord-api-types/globals";

export interface Snapshot<TRaw> {
	readonly id: Snowflake;
	readonly raw: TRaw;
	readonly source: SnapshotSource;
	readonly receivedAt: number;
}

export enum SnapshotSource {
	Cache = 0,
	Rest = 1,
	Gateway = 2,
}

export abstract class BaseSnapshot<TRaw> implements Snapshot<TRaw> {
	constructor(
		readonly id: string,
		readonly raw: TRaw,
		readonly source: SnapshotSource,
		readonly receivedAt: number = Date.now(),
	) {}
}
