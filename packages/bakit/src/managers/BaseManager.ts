import { Collection } from "@discordjs/collection";
import type { Snowflake } from "discord-api-types/globals";

import type { EntityRef } from "../refs";
import type { Snapshot } from "../snapshots";

export abstract class BaseManager<TSnapshot extends Snapshot<unknown>, TRef extends EntityRef<TSnapshot>> {
	#cache = new Collection<string, TSnapshot>();

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

	abstract ref(id: Snowflake, current?: TSnapshot): TRef;
	abstract fetch(id: Snowflake): Promise<TSnapshot>;

	resolve(id: Snowflake, required: true): Promise<TSnapshot>;
	resolve(id: Snowflake, required?: false): Promise<TSnapshot | undefined>;
	resolve(id: Snowflake, required?: boolean): Promise<TSnapshot | undefined>;
	async resolve(id: Snowflake, required?: boolean): Promise<TSnapshot | undefined> {
		const cached = this.get(id);

		if (cached) {
			return cached;
		}

		try {
			return await this.fetch(id);
		} catch (error) {
			if (required) {
				throw error;
			}

			return undefined;
		}
	}
}
