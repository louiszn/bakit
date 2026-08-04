import { makeURLSearchParams } from "@discordjs/rest";
import type {
	APIEmoji,
	APIUser,
	RESTGetAPIChannelMessageReactionUsersQuery,
} from "discord-api-types/v10";
import { Routes } from "discord-api-types/v10";

import type { Resources } from "#/client";

import type { MessageRef } from "../message";
import { Snapshot, type SnapshotSource } from "../Snapshot";
import type { UserRef } from "../user";

export interface MessageReactionRaw {
	message: MessageRef;
	emoji: APIEmoji;
}

export class MessageReactionSnapshot extends Snapshot<MessageReactionRaw> {
	get message() {
		return this.raw.message;
	}

	get emoji() {
		return this.raw.emoji;
	}

	get key() {
		return this.emoji.id ? `${this.emoji.name}:${this.emoji.id}` : `${this.emoji.name}`;
	}

	async users(query?: RESTGetAPIChannelMessageReactionUsersQuery): Promise<UserRef[]> {
		const raw = (await this.resources.rest.get(
			Routes.channelMessageReaction(this.message.channelId, this.message.id, this.key),
			{
				query: makeURLSearchParams(query ?? {}),
			},
		)) as APIUser[];

		return raw.map((user) => {
			const snapshot = this.resources.users.createSnapshot(user.id, user, this.source);
			return this.resources.users.ref(user.id, snapshot);
		});
	}

	remove() {
		return this.resources.rest.delete(
			Routes.channelMessageReaction(this.message.channelId, this.message.id, this.key),
		);
	}
}

export function createMessageReactionSnapshot(
	resources: Resources,
	raw: MessageReactionRaw,
	source: SnapshotSource,
	receivedAt = Date.now(),
) {
	const id = `${raw.message.id}:${raw.emoji.id ?? raw.emoji.name}`;

	return new MessageReactionSnapshot(resources, id, raw, source, receivedAt);
}
