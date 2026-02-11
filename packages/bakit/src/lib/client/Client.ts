import EventEmitter from "node:events";

import { ShardingManager, type ShardingManagerOptions } from "@bakit/gateway";
import { REST, type RESTLike } from "@bakit/rest";
import { Collection } from "@bakit/utils";

import { GatewayDispatchEvents, type GatewayDispatchPayload, type GatewayReceivePayload } from "discord-api-types/v10";

import { Message } from "../structures/Message.js";
import { User } from "../structures/User.js";
import { Guild } from "../structures/Guild.js";

import { ClientHelper } from "./ClientHelper.js";
import { Partial } from "./Partial.js";
import { IntentsBitField, type IntentResolvable } from "../utils/IntentsBitField.js";

export interface ClientOptions {
	token: string;
	intents: IntentResolvable | IntentsBitField;
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

	userUpdate: [user: User];

	guildCreate: [guild: Guild];
	guildAvailable: [guild: Guild];
	guildUpdate: [guild: Guild];
	guildDelete: [guild: Guild];
}

export class Client extends EventEmitter<ClientEvents> {
	public readonly options: Omit<Required<ClientOptions>, "partials" | "intents"> & {
		partials: Set<Partial>;
		intents: IntentsBitField;
	};

	public readonly shards: ShardingManager;
	public readonly rest: RESTLike;
	public readonly helper: ClientHelper;

	public readonly guilds = new Collection<string, Guild>();

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

				this.emit("userUpdate", new User(this, payload.d));

				break;
			}

			case GatewayDispatchEvents.GuildCreate: {
				let guild = this.guilds.get(payload.d.id);

				if (guild) {
					guild["_patch"](payload.d);
				} else {
					guild = new Guild(this, payload.d);
				}

				this.guilds.set(payload.d.id, guild);

				if (payload.d.unavailable) {
					this.emit("guildCreate", guild);
				} else {
					this.emit("guildAvailable", guild);
				}

				break;
			}

			case GatewayDispatchEvents.GuildDelete: {
				const guild = this.guilds.get(payload.d.id);

				if (!guild) {
					return;
				}

				this.guilds.delete(payload.d.id);
				this.emit("guildDelete", guild);
				break;
			}

			case GatewayDispatchEvents.GuildUpdate: {
				let guild = this.guilds.get(payload.d.id);

				if (guild) {
					guild["_patch"](payload.d);
				} else {
					guild = new Guild(this, payload.d);
					this.guilds.set(payload.d.id, guild);
				}

				this.emit("guildUpdate", guild);
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
