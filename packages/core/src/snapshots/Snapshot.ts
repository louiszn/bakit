import type { Snowflake } from "discord-api-types/globals";
import type { ValueOf } from "type-fest";
import type { Resources } from "../client";

export interface Snapshot<TRaw> {
	readonly id: Snowflake;
	readonly raw: TRaw;
	readonly source: SnapshotSource;
	readonly receivedAt: number;
}

export const SnapshotSource = {
	Cache: 0,
	Rest: 1,
	Gateway: 2,
} as const;
export type SnapshotSource = ValueOf<typeof SnapshotSource>;

export abstract class BaseSnapshot<TRaw> implements Snapshot<TRaw> {
	readonly id: string;
	readonly raw: TRaw;

	readonly source: SnapshotSource;
	readonly receivedAt: number;

	protected readonly resources: Resources;

	constructor(
		resources: Resources,
		id: string,
		raw: TRaw,
		source: SnapshotSource,
		receivedAt: number = Date.now(),
	) {
		this.resources = resources;

		this.id = id;
		this.raw = raw;

		this.source = source;
		this.receivedAt = receivedAt;
	}
}
