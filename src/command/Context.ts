import {
	ChatInputCommandInteraction,
	InteractionReplyOptions,
	Message,
	MessageCreateOptions,
	User,
} from "discord.js";
import { BakitClient } from "../BakitClient.js";

export type ChatInputContextSendOptions = string | InteractionReplyOptions;
export type MessageContextSendOptions = string | MessageCreateOptions;
export type ContextSendOptions = ChatInputContextSendOptions | MessageContextSendOptions;

export abstract class BaseContext<Cached extends boolean, InGuild extends boolean> {
	public constructor(
		public source:
			| ChatInputCommandInteraction<Cached extends true ? "cached" : "raw">
			| Message<InGuild>,
	) {}

	public get client(): BakitClient<true> {
		return this.source.client as BakitClient<true>;
	}

	public get channel() {
		return this.source.channel;
	}

	public get channelId() {
		return this.source.channelId;
	}

	public get guild() {
		return this.source.guild;
	}

	public get guildId() {
		return this.source.guildId;
	}

	public inGuild(): this is Context<Cached, true> {
		return Boolean(this.guildId);
	}

	public inCachedGuild(): this is Context<true, true> {
		if (this.isChatInput()) {
			return this.source.inCachedGuild();
		} else if (this.isMessage()) {
			return this.source.inGuild();
		} else {
			throw new Error("Invalid source");
		}
	}

	public get author(): User {
		if (this.isChatInput()) {
			return this.source.user;
		} else if (this.isMessage()) {
			return this.source.author;
		} else {
			throw new Error("Invalid source");
		}
	}

	public isChatInput(): this is ChatInputContext {
		return this.source instanceof ChatInputCommandInteraction;
	}

	public isMessage(): this is MessageContext {
		return this.source instanceof Message;
	}

	public abstract send(options: ContextSendOptions): Promise<Message<InGuild>>;
}

export class ChatInputContext<
	Cached extends boolean = boolean,
	InGuild extends boolean = boolean,
> extends BaseContext<Cached, InGuild> {
	declare public source: ChatInputCommandInteraction<Cached extends true ? "cached" : "raw">;

	public override async send(options: ContextSendOptions): Promise<Message<InGuild>> {
		if (typeof options === "string") {
			options = { content: options };
		}

		const sendOptions = {
			...(options as InteractionReplyOptions),
			withResponse: true,
		} as const;

		if (this.source.deferred || this.source.replied) {
			return (await this.source.followUp(sendOptions)) as Message<InGuild>;
		}

		const response = await this.source.reply(sendOptions);

		return response.resource?.message as Message<InGuild>;
	}
}

export class MessageContext<
	Cached extends boolean = boolean,
	InGuild extends boolean = boolean,
> extends BaseContext<Cached, InGuild> {
	declare public source: Message<InGuild>;

	public override async send(options: string | MessageCreateOptions): Promise<Message<InGuild>> {
		const { channel } = this;

		if (!channel?.isSendable()) {
			throw new Error("Invalid channel or channel is not sendable");
		}

		return (await channel.send(options)) as Message<InGuild>;
	}
}

export type Context<Cached extends boolean = boolean, InGuild extends boolean = boolean> =
	| ChatInputContext<Cached, InGuild>
	| MessageContext<Cached, InGuild>;
