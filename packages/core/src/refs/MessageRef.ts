import type { Snowflake } from "discord-api-types/globals";

import type { MessageManager } from "../managers";
import type { MessageSnapshot } from "../snapshots/MessageSnapshot";
import type { MessageReference } from "../types";
import { BaseEntityRef } from "./EntityRef";

export class MessageRef extends BaseEntityRef<MessageSnapshot> implements MessageReference {
	readonly channelId: string;

	readonly messages: MessageManager;
	readonly current?: MessageSnapshot;

	constructor(
		id: Snowflake,
		channelId: string,
		messages: MessageManager,
		current?: MessageSnapshot,
	) {
		super(id);

		this.channelId = channelId;
		this.messages = messages;
		this.current = current;
	}

	protected _fetch() {
		return this.messages.fetch(this.id, this.channelId);
	}

	protected _get() {
		return Promise.resolve(this.current ?? this.messages.get(this.id));
	}
}
