import type { Snowflake } from "discord-api-types/globals";
import { Routes } from "discord-api-types/v10";
import { MessageRef } from "../refs";
import { type MessageRaw, MessageSnapshot, SnapshotSource } from "../snapshots";
import { BaseManager } from "./BaseManager";

export class MessageManager extends BaseManager<
	MessageRaw,
	MessageSnapshot,
	MessageRef,
	[channelId: string]
> {
	createSnapshot(
		id: Snowflake,
		raw: MessageRaw,
		source: SnapshotSource,
		receivedAt = Date.now(),
	): MessageSnapshot {
		return new MessageSnapshot(this.resources, id, raw, source, receivedAt);
	}

	ref(id: Snowflake, channelId: string, current?: MessageSnapshot): MessageRef {
		return new MessageRef(id, channelId, this, current);
	}

	async fetch(id: Snowflake, channelId: string): Promise<MessageSnapshot> {
		const raw = (await this.resources.rest.get(Routes.channelMessage(channelId, id))) as MessageRaw;
		return this.createSnapshot(raw.id, raw, SnapshotSource.Rest);
	}
}
