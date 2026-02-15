// structures/channel/ForumChannel.ts
import { Collection } from "@discordjs/collection";
import { applyMixins } from "tiny-mixin";

import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin } from "@/lib/mixins/ChannelMixin.js";
import { Tag } from "../Tag.js";

import type { Client } from "@/lib/client/Client.js";
import type {
	APIGuildForumChannel,
	ForumLayoutType,
	SortOrderType,
	ThreadAutoArchiveDuration,
} from "discord-api-types/v10";
import type { MessageCreateOptions } from "@/lib/managers/client/ClientChannelManager.js";

export interface CreateForumPostOptions {
	name: string;
	message: MessageCreateOptions | string;
	autoArchiveDuration?: ThreadAutoArchiveDuration;
	rateLimitPerUser?: number;
	appliedTags?: string[];
}

export class GuildForumChannel extends applyMixins(BaseChannel<APIGuildForumChannel>, [GuildChannelMixin]) {
	#cachedTags?: Collection<string, Tag>;

	public constructor(client: Client, data: APIGuildForumChannel) {
		super(client, data);
	}

	get topic(): string | undefined {
		return this.data.topic ?? undefined;
	}

	get defaultAutoArchiveDuration(): ThreadAutoArchiveDuration | undefined {
		return this.data.default_auto_archive_duration;
	}

	get defaultSortOrder(): SortOrderType | null | undefined {
		return this.data.default_sort_order;
	}

	get defaultForumLayout(): ForumLayoutType | undefined {
		return this.data.default_forum_layout;
	}

	get defaultThreadRateLimitPerUser(): number | undefined {
		return this.data.default_thread_rate_limit_per_user;
	}

	get nsfw(): boolean {
		return this.data.nsfw ?? false;
	}

	get tags(): Collection<string, Tag> {
		if (!this.#cachedTags) {
			this.#cachedTags = new Collection();

			for (const tagData of this.data.available_tags ?? []) {
				const tag = new Tag(this.client, tagData);
				this.#cachedTags.set(tag.id, tag);
			}
		}

		return this.#cachedTags;
	}

	public override _patch(data: Partial<APIGuildForumChannel>): void {
		super._patch(data);
		this.#cachedTags = undefined;
	}
}
