import type { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	type GatewayDispatchPayload,
	type GatewayIntentBits,
} from "discord-api-types/v10";

import type { Client } from "#/client";
import { ClientEvent, GuildState } from "#/constants";
import { createMessageReactionSnapshot, SnapshotSource } from "#/models";
import { createInteractionSnapshot } from "#/utils";

export interface GatewayManagerOptions {
	token: string;
	intents: GatewayIntentBits;
	rest: REST;
	shardCount?: number | null;
	shardIds?: number[] | null;
}

export class GatewayManager {
	#ws: WebSocketManager;
	#ready = false;

	readonly client: Client;

	constructor(client: Client, options: GatewayManagerOptions) {
		this.client = client;

		this.#ws = new WebSocketManager({
			token: options.token,
			intents: options.intents,
			rest: options.rest,
			shardCount: options.shardCount ?? null,
			shardIds: options.shardIds ?? null,
		});
	}

	get ready() {
		return this.#ready;
	}

	async start() {
		this.#ws.on(WebSocketShardEvents.Dispatch, async (payload) => {
			this.#handleDispatch(payload as GatewayDispatchPayload);
		});

		await this.#ws.connect();
	}

	async stop() {
		await this.#ws.destroy();
		this.#ready = false;
	}

	#handleDispatch(payload: GatewayDispatchPayload) {
		const { client } = this;
		const { resources } = client;

		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				const { d: raw } = payload;

				const snapshot = resources.users.createSnapshot(
					raw.user.id,
					raw.user,
					SnapshotSource.Gateway,
				);
				const user = resources.users.ref(raw.user.id, snapshot);

				for (const guild of raw.guilds) {
					resources.guilds.states.set(
						guild.id,
						guild.unavailable ? GuildState.Unavailable : GuildState.Available,
					);
				}

				this.#ready = true;
				this.client.emit(ClientEvent.Ready, {
					client,
					raw,
					user,
				});

				break;
			}

			case GatewayDispatchEvents.MessageCreate: {
				const { d: raw } = payload;

				const snapshot = resources.messages.createSnapshot(raw.id, raw, SnapshotSource.Gateway);
				const message = resources.messages.ref(raw.id, raw.channel_id, snapshot);

				client.emit(ClientEvent.MessageCreate, {
					raw,
					client,
					message,
					author: snapshot.author,
				});

				break;
			}

			case GatewayDispatchEvents.MessageUpdate: {
				const { d: raw } = payload;

				const snapshot = resources.messages.createSnapshot(raw.id, raw, SnapshotSource.Gateway);
				const message = resources.messages.ref(raw.id, raw.channel_id, snapshot);

				client.emit(ClientEvent.MessageUpdate, {
					raw,
					client,
					message,
					author: snapshot.author,

					// TODO: implement cache module
					previous: undefined,
				});

				break;
			}

			case GatewayDispatchEvents.MessageDelete: {
				const { d: raw } = payload;

				const message = resources.messages.ref(raw.id, raw.channel_id);

				client.emit(ClientEvent.MessageDelete, {
					raw,
					client,
					message,

					// TODO: implement cache module
					previous: undefined,
				});

				break;
			}

			case GatewayDispatchEvents.MessageReactionAdd: {
				const { d: raw } = payload;

				const message = resources.messages.ref(raw.message_id, raw.channel_id);
				const user = resources.users.ref(raw.user_id);

				const reaction = createMessageReactionSnapshot(
					resources,
					{
						message,
						emoji: raw.emoji,
					},
					SnapshotSource.Gateway,
				);

				client.emit(ClientEvent.MessageReactionAdd, {
					client,
					raw,
					message,
					user,
					reaction,
				});

				break;
			}

			case GatewayDispatchEvents.MessageReactionRemove: {
				const { d: raw } = payload;

				const message = resources.messages.ref(raw.message_id, raw.channel_id);
				const user = resources.users.ref(raw.user_id);

				const reaction = createMessageReactionSnapshot(
					resources,
					{
						message,
						emoji: raw.emoji,
					},
					SnapshotSource.Gateway,
				);

				client.emit(ClientEvent.MessageReactionRemove, {
					client,
					raw,
					message,
					user,
					reaction,
				});

				break;
			}

			case GatewayDispatchEvents.MessageReactionRemoveEmoji: {
				const { d: raw } = payload;

				const message = resources.messages.ref(raw.message_id, raw.channel_id);

				const reaction = createMessageReactionSnapshot(
					resources,
					{
						message,
						emoji: raw.emoji,
					},
					SnapshotSource.Gateway,
				);

				client.emit(ClientEvent.MessageReactionRemoveEmoji, {
					client,
					raw,
					message,
					reaction,
				});

				break;
			}

			case GatewayDispatchEvents.MessageReactionRemoveAll: {
				const { d: raw } = payload;

				const message = resources.messages.ref(raw.message_id, raw.channel_id);

				client.emit(ClientEvent.MessageReactionRemoveAll, {
					client,
					raw,
					message,
				});

				break;
			}

			case GatewayDispatchEvents.InteractionCreate: {
				const { d: raw } = payload;

				const interaction = createInteractionSnapshot(resources, raw, SnapshotSource.Gateway);

				this.client.emit(ClientEvent.InteractionCreate, {
					interaction,
					raw,
					client,
				});

				break;
			}

			case GatewayDispatchEvents.GuildCreate: {
				const { d: raw } = payload;

				const state = resources.guilds.states.get(raw.id);

				const snapshot = resources.guilds.createSnapshot(raw.id, raw, SnapshotSource.Gateway);
				const guild = resources.guilds.ref(snapshot.id, snapshot);

				if (state === undefined) {
					resources.guilds.states.set(raw.id, GuildState.Available);

					if (this.ready) {
						client.emit(ClientEvent.GuildCreate, {
							client,
							guild,
							raw,
						});
					}
				} else if (state === GuildState.Unavailable && !raw.unavailable) {
					resources.guilds.states.set(raw.id, GuildState.Available);

					client.emit(ClientEvent.GuildAvailable, {
						client,
						guild,
						raw,
					});
				}

				break;
			}

			case GatewayDispatchEvents.GuildDelete: {
				const { d: raw } = payload;

				const guild = resources.guilds.ref(raw.id);

				if (raw.unavailable) {
					resources.guilds.states.set(raw.id, GuildState.Unavailable);

					client.emit(ClientEvent.GuildUnavailable, {
						client,
						guild,
						raw,

						// TODO: implement cache module
						previous: undefined,
					});
				} else {
					resources.guilds.states.delete(raw.id);

					client.emit(ClientEvent.GuildDelete, {
						client,
						guild,
						raw,

						// TODO: implement cache module
						previous: undefined,
					});
				}

				break;
			}

			default: {
				this.client.emit(ClientEvent.Raw, payload);
				break;
			}
		}
	}
}
