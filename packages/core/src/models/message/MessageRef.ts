import type { Snowflake } from "discord-api-types/globals";

import type { MessageReference } from "#/types";

import { BaseEntityRef } from "../EntityRef";
import type { MessageManager } from "./MessageManager";
import type { MessageSnapshot } from "./MessageSnapshot";

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

	fetch() {
		return this.messages.fetch(this.id, this.channelId);
	}

	get() {
		return Promise.resolve(this.current);
	}
}
