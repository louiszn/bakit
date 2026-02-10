import EventEmitter from "node:events";

import { ShardingManager, type ShardingManagerOptions } from "@bakit/gateway";
import { type RESTLike, REST } from "@bakit/rest";
import { GatewayDispatchEvents, type GatewayDispatchPayload, type GatewayReceivePayload } from "discord-api-types/v10";

import { Message } from "./structures/Message.js";
import { User } from "./structures/User.js";
import { ClientHelper } from "./ClientHelper.js";

export enum Partial {
	Message,
	User,
}

export interface ClientOptions {
	token: string;
	intents: bigint | number;
	sharding?: ClientShardingOptions;
	partials?: Partial[];
}

export type ClientShardingOptions = Omit<ShardingManagerOptions, "token" | "intents">;

export interface ClientEvents {
	ready: [user: User];
	error: [error: Error];

	dispatch: [shardId: number, payload: GatewayDispatchPayload];
	raw: [shardId: number, payload: GatewayReceivePayload];

	messageCreate: [message: Message];
	messageUpdate: [message: Message];
	messageDelete: [message: { id: string; channelId: string; guildId?: string }];
}

export class Client extends EventEmitter<ClientEvents> {
	public readonly options: Omit<Required<ClientOptions>, "partials"> & { partials: Set<Partial> };

	public readonly shards: ShardingManager;
	public readonly rest: RESTLike;
	public readonly helper: ClientHelper;

	#user?: User;
	#ready = false;

	public constructor(options: ClientOptions, rest?: RESTLike) {
		super();

		this.options = {
			token: options.token,
			intents: options.intents,
			sharding: {
				shardsPerCluster: options.sharding?.shardsPerCluster ?? 1,
				totalShards: options.sharding?.totalShards ?? 1,
			},
			partials: new Set(options.partials ?? []),
		};

		this.rest = rest ?? new REST({ token: options.token });

		this.shards = new ShardingManager(
			{
				...this.options.sharding,
				token: options.token,
				intents: options.intents,
			},
			rest,
		);

		this.helper = new ClientHelper(this);

		this.#setupShardsListeners();
	}

	get user() {
		return this.#user;
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

			case GatewayDispatchEvents.MessageCreate: {
				const message = new Message(this, payload.d);

				if (message.partial && !this.options.partials.has(Partial.Message)) {
					return;
				}

				this.emit("messageCreate", message);
				break;
			}

			case GatewayDispatchEvents.MessageUpdate: {
				const message = new Message(this, payload.d);

				if (message.partial && !this.options.partials.has(Partial.Message)) {
					return;
				}

				this.emit("messageUpdate", message);
				break;
			}

			case GatewayDispatchEvents.MessageDelete: {
				this.emit("messageDelete", {
					id: payload.d.id,
					channelId: payload.d.channel_id,
					guildId: payload.d.guild_id,
				});

				break;
			}

			case GatewayDispatchEvents.UserUpdate: {
				if (payload.d.id === this.#user?.id) {
					this.#user = new User(this, payload.d);
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
