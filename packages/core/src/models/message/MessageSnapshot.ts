import type { MessageRaw, MessageReference, MessageReplyOptions } from "#/types";

import type { GuildRef } from "../guild";
import { Snapshot } from "../Snapshot";
import type { UserRef } from "../user";

export class MessageSnapshot extends Snapshot<MessageRaw> implements MessageReference {
	#author?: UserRef;
	#guild?: GuildRef;

	get channelId() {
		return this.raw.channel_id;
	}

	get guildId() {
		return "guild_id" in this.raw ? this.raw.guild_id : undefined;
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

	get guild() {
		if (!this.guildId) {
			return undefined;
		}

		if (!this.#guild) {
			this.#guild = this.resources.guilds.ref(this.guildId);
		}

		return this.#guild;
	}

	async reply(options: MessageReplyOptions | string) {
		const opts = typeof options === "string" ? { content: options } : options;

		return this.resources.messages.create(this.channelId, {
			...opts,
			reply: this,
		});
	}
}
