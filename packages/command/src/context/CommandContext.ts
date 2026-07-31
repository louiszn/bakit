import {
	type Bakit,
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
	client: Bakit;
}

export abstract class BaseCommandContext<
	Source extends CommandContextSource,
	Values extends object = object,
> {
	readonly source: Source;
	readonly author: UserRef;
	readonly client: Bakit;
	readonly values!: Readonly<Values>;

	constructor(options: CommandContextOptions<Source>) {
		this.source = options.source;
		this.author = options.author;
		this.client = options.client;
	}

	get channelId() {
		return this.source.channelId;
	}

	isMessage(): this is MessageCommandContext<Values> {
		return this.source instanceof MessageSnapshot;
	}

	isChatInput(): this is ChatInputCommandContext<Values> {
		return this.source instanceof ChatInputInteractionSnapshot;
	}

	abstract send(options: MessageCreateOptions): Promise<MessageRef>;
}

export type CommandContext<Values extends object = object> =
	| ChatInputCommandContext<Values>
	| MessageCommandContext<Values>;
