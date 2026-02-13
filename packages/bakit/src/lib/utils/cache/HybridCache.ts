import { LocalCacheAdapter } from "./adapters/LocalCacheAdapter.js";

import type { BaseCacheAdapter } from "./adapters/BaseCacheAdapter.js";

export class HybridCache<Key, Value> {
	public local = new LocalCacheAdapter<Key, Value>();

	public constructor(
		public remote?: BaseCacheAdapter<Key, Value>,
		public defaultTTL?: number,
	) {}

	public async get(key: Key): Promise<Value | undefined> {
		const local = this.local.get(key);

		if (local !== undefined) {
			return local;
		}

		const remote = await this.remote?.get(key);

		if (remote !== undefined) {
			this.local.set(key, remote);
		}

		return remote;
	}

	public async sweep(filter: (data: Value) => boolean): Promise<void> {
		this.local.sweep(filter);
		await this.remote?.sweep(filter);
	}

	public async set(key: Key, value: Value, ttl = this.defaultTTL): Promise<void> {
		this.local.set(key, value, ttl);
		await this.remote?.set(key, value, ttl);
	}

	public async delete(key: Key): Promise<void> {
		this.local.delete(key);
		await this.remote?.delete(key);
	}

	public async clear(): Promise<void> {
		this.local.clear();
		await this.remote?.clear();
	}

	public async has(key: Key): Promise<boolean> {
		return (await this.get(key)) !== undefined;
	}
}
