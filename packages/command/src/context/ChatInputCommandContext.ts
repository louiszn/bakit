import type { ChatInputInteractionSnapshot, MessageCreateOptions, MessageRef } from "bakit";

import { BaseCommandContext } from "./CommandContext";

export class ChatInputCommandContext extends BaseCommandContext<ChatInputInteractionSnapshot> {
	send(options: MessageCreateOptions | string): Promise<MessageRef> {
		return this.source.reply(
			typeof options === "string"
				? { content: options, withMessage: true }
				: { ...options, withMessage: true },
		);
	}
}
