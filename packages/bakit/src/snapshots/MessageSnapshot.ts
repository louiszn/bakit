import type {
	APIMessage,
	GatewayMessageCreateDispatchData,
	GatewayMessageUpdateDispatchData,
} from "discord-api-types/v10";
import type { UserRef } from "../refs";
import type { MessageReference, ReplyMessageOptions } from "../types";
import { BaseSnapshot } from "./Snapshot";

export type MessageRaw =
	| GatewayMessageCreateDispatchData
	| GatewayMessageUpdateDispatchData
	| APIMessage;

export class MessageSnapshot extends BaseSnapshot<MessageRaw> implements MessageReference {
	#author?: UserRef;

	get channelId() {
		return this.raw.channel_id;
	}

	get content() {
		return this.raw.content;
	}

	get author() {
		if (!this.#author) {
			const { author } = this.raw;

			const snapshot = this.resources.users.createSnapshot(
				author.id,
				author,
				this.source,
				this.receivedAt,
			);
			this.#author = this.resources.users.ref(author.id, snapshot);
		}

		return this.#author;
	}

	async reply(options: ReplyMessageOptions | string) {
		const opts = typeof options === "string" ? { content: options } : options;

		return this.resources.messages.create(this.channelId, {
			...opts,
			reply: this,
		});
	}
}
