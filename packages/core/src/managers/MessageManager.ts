import type { Snowflake } from "discord-api-types/globals";
import {
	type APIMessage,
	type RESTAPIMessageReference,
	type RESTPostAPIChannelMessageFormDataBody,
	Routes,
} from "discord-api-types/v10";

import { MessageRef } from "../refs";
import { type MessageRaw, MessageSnapshot, SnapshotSource } from "../snapshots";
import type { MessageCreateOptions } from "../types";
import { resolveFlags } from "../utils";
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

	async create(channelId: string, options: MessageCreateOptions | string) {
		const opts: MessageCreateOptions = typeof options === "string" ? { content: options } : options;

		const reference: RESTAPIMessageReference | undefined = (() => {
			if (!opts.reply) {
				return;
			}

			if (typeof opts.reply === "string") {
				return {
					message_id: opts.reply,
					channel_id: channelId,
				};
			}

			return {
				message_id: opts.reply.id,
				channel_id: opts.reply.channelId ?? channelId,
			};
		})();

		const payload: RESTPostAPIChannelMessageFormDataBody = {
			content: opts.content,
			message_reference: reference ?? undefined,
			flags: resolveFlags(opts.flags),
		};

		const raw = (await this.resources.rest.post(Routes.channelMessages(channelId), {
			body: payload,
		})) as APIMessage;

		const snapshot = this.createSnapshot(raw.id, raw, SnapshotSource.Rest);
		return this.ref(raw.id, channelId, snapshot);
	}
}
