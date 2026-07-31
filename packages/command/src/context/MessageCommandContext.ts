import type { MessageCreateOptions, MessageRef, MessageSnapshot } from "bakit";

import { BaseCommandContext } from "./CommandContext";

export class MessageCommandContext<Values extends object = object> extends BaseCommandContext<
	MessageSnapshot,
	Values
> {
	send(options: MessageCreateOptions): Promise<MessageRef> {
		return this.source.resources.messages.create(this.source.channelId, options);
	}
}
