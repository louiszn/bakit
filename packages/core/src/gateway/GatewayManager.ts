import type { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	type GatewayDispatchPayload,
	type GatewayIntentBits,
} from "discord-api-types/v10";

import { type Client, ClientEvent } from "../client";
import { SnapshotSource } from "../snapshots";
import { createInteractionSnapshot } from "../utils/interaction";

export interface GatewayManagerOptions {
	token: string;
	intents: GatewayIntentBits;
	rest: REST;
	shardCount?: number | null;
	shardIds?: number[] | null;
}

export class GatewayManager {
	#ws: WebSocketManager;
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

	async start() {
		this.#ws.on(WebSocketShardEvents.Dispatch, async (payload) => {
			this.#handleDispatch(payload as GatewayDispatchPayload);
		});

		await this.#ws.connect();
	}

	async stop() {
		await this.#ws.destroy();
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
					deleted: undefined,
				});

				break;
			}

			case GatewayDispatchEvents.InteractionCreate: {
				const { d: raw } = payload;

				const interaction = createInteractionSnapshot(resources, raw, SnapshotSource.Gateway);
				this.client.emit("interactionCreate", {
					interaction,
					raw,
					client,
				});

				break;
			}

			default: {
				this.client.emit(ClientEvent.Raw, payload);
				break;
			}
		}
	}
}
