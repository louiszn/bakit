import { Collection } from "@discordjs/collection";
import { BaseCacheAdapter } from "./BaseCacheAdapter.js";

export interface LocalCacheTTLEntry<Value> {
	value: Value;
	expiresAt?: number;
}

export class LocalCacheAdapter<Key, Value> extends BaseCacheAdapter<Key, Value> {
	public collection = new Collection<Key, LocalCacheTTLEntry<Value>>();

	#sweepTimer?: NodeJS.Timeout;

	public get(key: Key): Value | undefined {
		const entry = this.collection.get(key);

		if (!entry) {
			return undefined;
		}

		if (entry.expiresAt && entry.expiresAt < Date.now()) {
			this.collection.delete(key);
			return undefined;
		}

		this.#setupSweepTTL();

		return entry.value;
	}

	public set(key: Key, value: Value, ttl?: number): void {
		const expiresAt = ttl ? Date.now() + ttl : undefined;

		this.collection.set(key, {
			value,
			expiresAt,
		});

		this.#setupSweepTTL();
	}

	public delete(key: Key): void {
		this.#setupSweepTTL();
		this.collection.delete(key);
	}

	public clear(): void {
		this.collection.clear();

		clearTimeout(this.#sweepTimer);
		this.#sweepTimer = undefined;
	}

	public has(key: Key): boolean {
		this.#setupSweepTTL();
		return this.get(key) !== undefined;
	}

	public find(filter: (data: Value) => boolean): Value | undefined {
		for (const entry of this.collection.values()) {
			if (filter(entry.value)) {
				return entry.value;
			}
		}

		return undefined;
	}

	public forEach(callback: (value: Value, key: Key) => void): void {
		for (const [key, entry] of this.collection) {
			callback(entry.value, key);
		}
	}

	public map<T>(callback: (value: Value, key: Key) => T): T[] {
		return this.collection.map<T>((entry, key) => callback(entry.value, key));
	}

	public sweep(filter: (data: Value) => boolean): void {
		for (const [key, entry] of this.collection) {
			if (filter(entry.value)) {
				this.delete(key);
			}
		}
	}

	public sweepTTL() {
		for (const [key, entry] of this.collection) {
			if (entry.expiresAt && entry.expiresAt < Date.now()) {
				this.delete(key);
			}
		}
	}

	#setupSweepTTL() {
		if (!this.collection.size) {
			return;
		}

		if (this.#sweepTimer) {
			return;
		}

		this.#sweepTimer = setTimeout(() => {
			this.#sweepTimer = undefined;
			this.sweepTTL();
			this.#setupSweepTTL();
		}, 1000);
	}
}
