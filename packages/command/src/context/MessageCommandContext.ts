import type { MessageCreateOptions, MessageRef, MessageSnapshot } from "bakit";

import { BaseCommandContext } from "./CommandContext";

export class MessageCommandContext extends BaseCommandContext<MessageSnapshot> {
	send(options: MessageCreateOptions): Promise<MessageRef> {
		return this.source.resources.messages.create(this.source.channelId, options);
	}
}
