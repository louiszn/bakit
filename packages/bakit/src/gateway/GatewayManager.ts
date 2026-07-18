import type { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	type GatewayDispatchPayload,
	type GatewayIntentBits,
	type GatewayMessageCreateDispatchData,
	type GatewayReadyDispatchData,
} from "discord-api-types/v10";

import type { Client } from "../client";
import { SnapshotSource, UserSnapshot } from "../snapshots";

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

	constructor(
		client: Client,
		options: GatewayManagerOptions,
	) {
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
		switch (payload.t) {
			case GatewayDispatchEvents.Ready: {
				const raw = payload.d as GatewayReadyDispatchData;

				const user = this.client.resources.users.ref(
					raw.user.id,
					new UserSnapshot(raw.user.id, raw.user, SnapshotSource.Gateway),
				);

				this.client.emit("ready", {
					raw,
					user,
				});

				break;
			}

			case GatewayDispatchEvents.MessageCreate: {
				const raw = payload.d as GatewayMessageCreateDispatchData;

				this.client.emit("rawMessageCreate", {
					raw,
				});

				break;
			}

			default: {
				this.client.emit("raw", payload);
				break;
			}
		}
	}
}
