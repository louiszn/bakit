import type { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	type GatewayDispatchPayload,
	type GatewayIntentBits,
	type GatewayMessageCreateDispatchData,
	type GatewayReadyDispatchData,
} from "discord-api-types/v10";

import { type Client, ClientEvent } from "../client";
import { SnapshotSource } from "../snapshots";

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
		const { resources } = this.client;

		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				const raw = payload.d as GatewayReadyDispatchData;

				const snapshot = resources.users.createSnapshot(
					raw.user.id,
					raw.user,
					SnapshotSource.Gateway,
				);
				const user = resources.users.ref(raw.user.id, snapshot);

				this.client.emit(ClientEvent.Ready, {
					raw,
					user,
				});

				break;
			}

			case GatewayDispatchEvents.MessageCreate: {
				const raw = payload.d as GatewayMessageCreateDispatchData;

				const snapshot = resources.messages.createSnapshot(raw.id, raw, SnapshotSource.Gateway);
				const message = resources.messages.ref(raw.id, raw.channel_id, snapshot);

				this.client.emit(ClientEvent.MessageCreate, {
					raw,
					message,
					author: snapshot.author,
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
