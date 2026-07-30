import {
	ChatInputInteractionSnapshot,
	type MessageCreateOptions,
	type MessageRef,
	MessageSnapshot,
	type UserRef,
} from "bakit";

import type { ChatInputCommandContext } from "./ChatInputCommandContext";
import type { MessageCommandContext } from "./MessageCommandContext";

export type CommandContextSource = ChatInputInteractionSnapshot | MessageSnapshot;

export interface CommandContextOptions<Source extends CommandContextSource> {
	source: Source;
	author: UserRef;
}

export abstract class BaseCommandContext<Source extends CommandContextSource> {
	readonly source: Source;
	readonly author: UserRef;

	constructor(options: CommandContextOptions<Source>) {
		this.source = options.source;
		this.author = options.author;
	}

	get channelId() {
		return this.source.channelId;
	}

	isMessage(): this is MessageCommandContext {
		return this.source instanceof MessageSnapshot;
	}

	isChatInput(): this is ChatInputCommandContext {
		return this.source instanceof ChatInputInteractionSnapshot;
	}

	abstract send(options: MessageCreateOptions): Promise<MessageRef>;
}

export type CommandContext = ChatInputCommandContext | MessageCommandContext;
