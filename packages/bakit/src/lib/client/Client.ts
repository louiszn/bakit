import EventEmitter from "node:events";

import { ShardingManager, type ShardingManagerOptions } from "@bakit/gateway";
import { REST, type RESTLike } from "@bakit/rest";

import { GatewayDispatchEvents, type GatewayDispatchPayload, type GatewayReceivePayload } from "discord-api-types/v10";

import { Message } from "../structures/Message.js";
import { User } from "../structures/User.js";
import { Guild } from "../structures/Guild.js";

import { ClientHelper } from "./ClientHelper.js";
import { Partial } from "./Partial.js";
import { IntentsBitField, type IntentResolvable } from "../utils/IntentsBitField.js";
import { ClientCacheManager, ClientChannelManager, type ClientCacheManagerOptions } from "../managers/client/index.js";

import { handlers } from "./dispatches/index.js";

import type { Channel, Typing, ThreadBasedChannel } from "../structures/index.js";
import type { ClientGatewayDispatchHandler } from "./dispatches/registry.js";

export interface ClientOptions {
	token: string;
	intents: IntentResolvable | IntentsBitField;
	sharding?: ClientShardingOptions;
	partials?: Partial[];
	cache?: ClientCacheManagerOptions;
}

export type ClientShardingOptions = Omit<ShardingManagerOptions, "token" | "intents">;

export interface ClientEvents {
	ready: [user: User];
	error: [error: Error];

	dispatch: [shardId: number, payload: GatewayDispatchPayload];
	raw: [shardId: number, payload: GatewayReceivePayload];

	messageCreate: [message: Message];
	messageUpdate: [message: Message];
	messageDelete: [message: Message];

	userUpdate: [user: User];

	guildCreate: [guild: Guild];
	guildAvailable: [guild: Guild];
	guildUpdate: [guild: Guild];
	guildDelete: [guild: Guild];

	channelCreate: [channel: Channel];
	channelUpdate: [channel: Channel];
	channelDelete: [channel: Channel];

	threadCreate: [thread: ThreadBasedChannel];
	threadUpdate: [thread: ThreadBasedChannel];
	threadDelete: [thread: ThreadBasedChannel];

	typingStart: [typing: Typing];
}

export class Client<Ready extends boolean = boolean> extends EventEmitter<ClientEvents> {
	public readonly options: Omit<Required<ClientOptions>, "partials" | "intents"> & {
		partials: Set<Partial>;
		intents: IntentsBitField;
	};

	public readonly shards: ShardingManager;
	public readonly rest: RESTLike;

	/**
	 * @private
	 * @deprecated
	 */
	public readonly helper: ClientHelper;

	public readonly cache: ClientCacheManager;

	public readonly channels: ClientChannelManager;

	#user?: User;
	#ready = false;

	public constructor(options: ClientOptions, rest?: RESTLike) {
		super();

		const intents = options.intents instanceof IntentsBitField ? options.intents : new IntentsBitField(options.intents);
		const sharding = {
			shardsPerCluster: options.sharding?.shardsPerCluster ?? 1,
			totalShards: options.sharding?.totalShards ?? 1,
		};

		this.options = {
			token: options.token,
			intents,
			sharding,
			partials: new Set(options.partials ?? []),
			cache: options.cache ?? {},
		};

		this.rest = rest ?? new REST({ token: options.token });

		this.shards = new ShardingManager(
			{
				...this.options.sharding,
				token: this.options.token,
				intents: this.options.intents.toBigInt(),
			},
			rest,
		);

		this.cache = new ClientCacheManager(this.options.cache);
		this.channels = new ClientChannelManager(this);

		this.helper = new ClientHelper(this);

		this.#setupShardsListeners();
	}

	get user(): Ready extends true ? User : User | undefined {
		return this.#user as Ready extends true ? User : User | undefined;
	}

	public async login() {
		if (this.#user || this.shards.ready || this.shards.clusters.size > 0) {
			throw new Error("Cannot login twice");
		}

		await this.shards.spawn();

		return new Promise<void>((resolve, reject) => {
			const cleanup = () => {
				this.removeListener("ready", onReady);
				this.removeListener("error", onError);
			};

			const onReady = () => {
				cleanup();
				resolve();
			};

			const onError = (error: Error) => {
				cleanup();
				reject(error);
			};

			this.once("ready", onReady);
			this.once("error", onError);
		});
	}

	#setupShardsListeners() {
		this.shards.on("dispatch", (_, shardId, payload) => this.#handleDispatch(shardId, payload));
		this.shards.on("raw", (_, shardId, payload) => this.emit("raw", shardId, payload));
		this.shards.once("ready", () => this.#tryEmitReady());
	}

	async #handleDispatch(shardId: number, payload: GatewayDispatchPayload) {
		this.emit("dispatch", shardId, payload);

		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				this.#user ??= new User(this, payload.d.user);

				// Usually, this won't do anything but still be good to have
				// in case the shards emit `ready` event out of order
				this.#tryEmitReady();
				break;
			}

			default: {
				const handler = handlers[payload.t] as ClientGatewayDispatchHandler;

				if (handler) {
					await handler(this, payload);
				}

				break;
			}
		}
	}

	/**
	 * We use this method to emit ready event only once since we have 2 ways to emit it.
	 * @private
	 */
	#tryEmitReady() {
		if (this.#ready || !this.#user || !this.shards.ready) {
			return;
		}

		this.#ready = true;
		this.emit("ready", this.#user!);
	}
}

export function createClient(options: ClientOptions) {
	return new Client(options);
}
