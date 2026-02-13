import type { Awaitable } from "@bakit/utils";

export abstract class BaseCacheAdapter<Key, Value> {
	public abstract get(key: Key): Awaitable<Value | undefined>;
	public abstract set(key: Key, value: Value, ttl?: number): Awaitable<void>;
	public abstract delete(key: Key): Awaitable<void>;
	public abstract clear(): Awaitable<void>;
	public abstract has(key: Key): Awaitable<boolean>;
	public abstract sweep(filter: (data: Value) => boolean): Awaitable<void>;
}
