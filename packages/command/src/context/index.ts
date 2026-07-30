import { ChatInputInteractionSnapshot, type MessageSnapshot } from "bakit";

import { ChatInputCommandContext } from "./ChatInputCommandContext";
import type { CommandContext, CommandContextOptions, CommandContextSource } from "./CommandContext";
import { MessageCommandContext } from "./MessageCommandContext";

export * from "./ChatInputCommandContext";
export * from "./CommandContext";
export * from "./MessageCommandContext";

export function createContext(
	options: CommandContextOptions<CommandContextSource>,
): CommandContext {
	if (options.source instanceof ChatInputInteractionSnapshot) {
		return new ChatInputCommandContext(
			options as CommandContextOptions<ChatInputInteractionSnapshot>,
		);
	}

	return new MessageCommandContext(options as CommandContextOptions<MessageSnapshot>);
}
