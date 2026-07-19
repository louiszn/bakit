import { Collection } from "@discordjs/collection";
import type { Snowflake } from "discord-api-types/globals";
import type { Resources } from "../client";
import type { EntityRef } from "../refs";
import type { Snapshot, SnapshotSource } from "../snapshots";

export abstract class BaseManager<
	TRaw,
	TSnapshot extends Snapshot<TRaw>,
	TRef extends EntityRef<TSnapshot>,
	TContext extends unknown[] = [],
> {
	readonly resources: Resources;
	#cache = new Collection<string, TSnapshot>();

	constructor(resources: Resources) {
		this.resources = resources;
	}

	get(id: Snowflake): TSnapshot | undefined {
		return this.#cache.get(id);
	}

	add(snapshot: TSnapshot): TSnapshot {
		this.#cache.set(snapshot.id, snapshot);
		return snapshot;
	}

	delete(id: Snowflake): boolean {
		return this.#cache.delete(id);
	}

	has(id: Snowflake): boolean {
		return this.#cache.has(id);
	}

	clear(): void {
		this.#cache.clear();
	}

	abstract createSnapshot(
		id: Snowflake,
		raw: TRaw,
		source: SnapshotSource,
		receivedAt: number,
	): TSnapshot;
	abstract ref(id: Snowflake, ...args: [...context: TContext, current?: TSnapshot]): TRef;
	abstract fetch(id: Snowflake, ...context: TContext): Promise<TSnapshot>;

	resolve(id: Snowflake, ...args: [...context: TContext, required: true]): Promise<TSnapshot>;
	resolve(
		id: Snowflake,
		...args: [...context: TContext, required?: false]
	): Promise<TSnapshot | undefined>;
	async resolve(
		id: Snowflake,
		...args: [...context: TContext, required?: boolean]
	): Promise<TSnapshot | undefined> {
		const last = args.at(-1);
		const required = typeof last === "boolean" ? last : false;

		const context = (typeof last === "boolean" ? args.slice(0, -1) : args) as unknown as TContext;

		const cached = this.get(id);

		if (cached !== undefined) {
			return cached;
		}

		try {
			return await this.fetch(id, ...context);
		} catch (error) {
			if (required) {
				throw error;
			}

			return undefined;
		}
	}
}
