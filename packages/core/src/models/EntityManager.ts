import type { Snowflake } from "discord-api-types/globals";

import type { EntityRef } from "./EntityRef";
import type { Snapshot, SnapshotSource } from "./Snapshot";

import type { Resources } from "../client";

export abstract class BaseEntityManager<
	TRaw,
	TSnapshot extends Snapshot<TRaw>,
	TRef extends EntityRef<TSnapshot>,
	TContext extends unknown[] = [],
> {
	readonly resources: Resources;

	constructor(resources: Resources) {
		this.resources = resources;
	}

	abstract createSnapshot(
		id: Snowflake,
		raw: TRaw,
		source: SnapshotSource,
		receivedAt: number,
	): TSnapshot;
	abstract ref(id: Snowflake, ...args: [...context: TContext, current?: TSnapshot]): TRef;
	abstract fetch(id: Snowflake, ...context: TContext): Promise<TSnapshot>;

	resolve(id: Snowflake, ...args: TContext): Promise<TSnapshot> {
		return this.fetch(id, ...args);
	}
}
