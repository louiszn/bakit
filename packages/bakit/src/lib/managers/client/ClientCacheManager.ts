import { Collection } from "@discordjs/collection";
import type { Channel, Guild, Message } from "../../structures/index.js";
import type { User } from "../../structures/User.js";

import { BaseCacheAdapter, HybridCache, LocalCacheAdapter } from "../../utils/index.js";

export interface ClientCacheManagerOptions {
	users?: ClientModuleCacheOptions<User> | boolean;
	messages?: ClientModuleCacheOptions<Message> | boolean;
}

export interface ClientModuleCacheOptions<Value> {
	enabled: boolean;
	adapter?: BaseCacheAdapter<string, Value>;
	ttl?: number;
	sweeper?: ClientModuleCacheSweeperOptions<Value>;
}

export interface ClientModuleCacheSweeperOptions<Value> {
	interval: number;
	filter: (data: Value) => boolean;
}

export class ClientCacheManager {
	public channels = new LocalCacheAdapter<string, Channel>();
	public guilds = new LocalCacheAdapter<string, Guild>();

	#users?: HybridCache<string, User>;
	#messages?: HybridCache<string, Message>;

	#sweepers = new Collection<keyof ClientCacheManagerOptions, NodeJS.Timeout>();

	public constructor(public options: ClientCacheManagerOptions) {}

	public get users() {
		let options: ClientModuleCacheOptions<User>;

		if (typeof this.options.users === "object") {
			options = this.options.users;
		} else {
			options = { enabled: !!this.options.users };
		}

		if (!options.enabled) {
			throw new Error("User cache is disabled");
		}

		if (!this.#users) {
			this.#users = new HybridCache(options.adapter, options.ttl);
		}

		if (options.sweeper) {
			this.#sweepers.set(
				"users",
				setInterval(() => this.#users!.sweep(options.sweeper!.filter), options.sweeper.interval),
			);
		}

		return this.#users;
	}

	public get messages() {
		let options: ClientModuleCacheOptions<Message>;

		if (typeof this.options.messages === "object") {
			options = this.options.messages;
		} else {
			options = { enabled: !!this.options.messages };
		}

		if (!options.enabled) {
			throw new Error("Message cache is disabled");
		}

		if (!this.#messages) {
			this.#messages = new HybridCache(options.adapter, options.ttl);
		}

		if (options.sweeper) {
			this.#sweepers.set(
				"messages",
				setInterval(() => this.#messages!.sweep(options.sweeper!.filter), options.sweeper.interval),
			);
		}

		return this.#messages;
	}

	public isModuleEnabled(module: keyof ClientCacheManagerOptions) {
		return typeof this.options[module] === "object" ? this.options[module].enabled : !!this.options[module];
	}

	async resolve<Value>(
		cache: HybridCache<string, Value> | LocalCacheAdapter<string, Value>,
		id: string,
		factory: () => Value,
		patch?: (value: Value) => void,
	): Promise<Value> {
		let value: Value | undefined = await cache.get(id);

		if (!value) {
			value = factory();
			await cache.set(id, value);
		}

		if (patch) {
			patch(value);
		}

		return value;
	}

	public resolveLocal<Value>(
		cache: LocalCacheAdapter<string, Value>,
		id: string,
		factory: () => Value,
		patch?: (value: Value) => void,
	): Value {
		let value: Value | undefined = cache.get(id);

		if (!value) {
			value = factory();
			cache.set(id, value);
		}

		if (patch) {
			patch(value);
		}

		return value;
	}
}
