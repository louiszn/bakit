import { BaseStructure } from "./BaseStructure.js";

import type { Client } from "@/lib/client/Client.js";
import type { APIGuildForumTag } from "discord-api-types/v10";

export class Tag extends BaseStructure {
	public constructor(
		client: Client,
		public data: APIGuildForumTag,
	) {
		super(client);
	}

	public get id(): string {
		return this.data.id;
	}

	public get name(): string {
		return this.data.name;
	}

	public get moderated(): boolean {
		return this.data.moderated ?? false;
	}

	public get emojiId(): string | undefined {
		return this.data.emoji_id ?? undefined;
	}

	public get emojiName(): string | undefined {
		return this.data.emoji_name ?? undefined;
	}

	public _patch(data: Partial<APIGuildForumTag>): void {
		this.data = {
			...this.data,
			...data,
		};
	}
}
