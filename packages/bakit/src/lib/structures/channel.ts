import {
	ChannelType,
	type APIChannel,
	type APIChannelBase,
	type APIDMChannel,
	type APIGuildChannel,
	type APIGuildTextChannel,
	type APIPrivateThreadChannel,
	type APIPublicThreadChannel,
	type APITextBasedChannel,
	type APIThreadChannel,
	type GuildTextChannelType,
	type Snowflake,
	type TextChannelType,
} from "discord-api-types/v10";

import { createUser, type User } from "./user.js";
import { type Message } from "./message.js";

import type { Client } from "../client/index.js";
import type { CreateMessageOptions } from "../client/helpers/channel.js";

export interface TextBasedChannelSingleton {
	lastMessageId?: Snowflake;

	send(content: string): Promise<Message>;
	send(options: CreateMessageOptions): Promise<Message>;
	send(options: CreateMessageOptions | string): Promise<Message>;
}

export interface VoiceBasedChannelSingleton {
	join(): Promise<void>;
}

export interface GuildBasedChannelSingleton {
	readonly name: string;
	readonly guildId?: Snowflake;
	readonly parentId?: Snowflake;
}

export interface GuildTextBasedChannelSingleton extends GuildBasedChannelSingleton, TextBasedChannelSingleton {}

export interface ThreadBasedChannelSingleton extends GuildTextBasedChannelSingleton {
	readonly messageCount?: number;
	readonly memberCount?: number;
	readonly ownerId?: Snowflake;
	readonly totalMessageSent?: number;
	readonly appliedTags?: Snowflake[];
}

export interface BaseChannel {
	readonly client: Client;

	readonly id: string;
	readonly type: ChannelType;

	isTextBased(): this is GuildTextChannel | DMChannel | PublicThreadChannel | PrivateThreadChannel;
	isVoiceBased(): this is VoiceChannel | StageChannel;
	isGuildBased(): this is GuildTextChannel | VoiceChannel | StageChannel | PublicThreadChannel | PrivateThreadChannel;
	isThreadBased(): this is PublicThreadChannel | PrivateThreadChannel;

	isDm(): this is DMChannel;
	isGuildText(): this is GuildTextChannel;
	isVoice(): this is VoiceChannel;
	isStage(): this is StageChannel;
	isPublicThread(): this is PublicThreadChannel;
	isPrivateThread(): this is PrivateThreadChannel;
}

export interface DMChannel extends BaseChannel, TextBasedChannelSingleton {
	readonly recipients?: User[];
}

export interface GuildTextChannel extends BaseChannel, GuildTextBasedChannelSingleton {}
export interface VoiceChannel extends GuildTextChannel, VoiceBasedChannelSingleton {}
export interface StageChannel extends GuildTextChannel, VoiceBasedChannelSingleton {}

export interface PublicThreadChannel extends BaseChannel, ThreadBasedChannelSingleton {}
export interface PrivateThreadChannel extends BaseChannel, ThreadBasedChannelSingleton {}

export type Channel = GuildTextChannel | DMChannel | PublicThreadChannel | VoiceChannel | StageChannel | BaseChannel;

export function createChannel(client: Client, data: APIChannel): Channel {
	switch (data.type) {
		case ChannelType.GuildText:
			return createGuildTextChannel(client, data);

		case ChannelType.DM:
			return createDMChannel(client, data);

		case ChannelType.PublicThread:
			return createPublicThreadChannel(client, data);

		case ChannelType.PrivateThread:
			return createPrivateThreadChannel(client, data);

		case ChannelType.GuildVoice:
			return createVoiceChannel(client, data);

		case ChannelType.GuildStageVoice:
			return createStageChannel(client, data);

		default:
			return createBaseChannel(client, data);
	}
}

export function createBaseChannel(client: Client, data: APIChannelBase<ChannelType>): BaseChannel {
	return {
		get client() {
			return client;
		},

		get id() {
			return data.id;
		},

		get type() {
			return data.type;
		},

		isTextBased(): this is GuildTextChannel | DMChannel | PublicThreadChannel | PrivateThreadChannel {
			return (
				data.type === ChannelType.GuildText ||
				data.type === ChannelType.DM ||
				data.type === ChannelType.PublicThread ||
				data.type === ChannelType.PrivateThread
			);
		},

		isVoiceBased(): this is VoiceChannel | StageChannel {
			return data.type === ChannelType.GuildVoice || data.type === ChannelType.GuildStageVoice;
		},

		isGuildBased(): this is
			| GuildTextChannel
			| VoiceChannel
			| StageChannel
			| PublicThreadChannel
			| PrivateThreadChannel {
			return (
				data.type === ChannelType.GuildText ||
				data.type === ChannelType.GuildVoice ||
				data.type === ChannelType.GuildStageVoice ||
				data.type === ChannelType.PublicThread ||
				data.type === ChannelType.PrivateThread
			);
		},

		isThreadBased(): this is PublicThreadChannel | PrivateThreadChannel {
			return data.type === ChannelType.PublicThread || data.type === ChannelType.PrivateThread;
		},

		isDm(): this is DMChannel {
			return data.type === ChannelType.DM;
		},

		isGuildText(): this is GuildTextChannel {
			return data.type === ChannelType.GuildText;
		},

		isVoice(): this is VoiceChannel {
			return data.type === ChannelType.GuildVoice;
		},

		isStage(): this is StageChannel {
			return data.type === ChannelType.GuildStageVoice;
		},

		isPublicThread(): this is PublicThreadChannel {
			return data.type === ChannelType.PublicThread;
		},

		isPrivateThread(): this is PrivateThreadChannel {
			return data.type === ChannelType.PrivateThread;
		},
	};
}

export function createGuildTextChannel(
	client: Client,
	data: APIGuildTextChannel<ChannelType.GuildText>,
): GuildTextChannel {
	return {
		...createBaseChannel(client, data),
		...createGuildBasedChannelSingleton(data),
		...createTextBasedChannelSingleton(client, data),
	};
}

export function createDMChannel(client: Client, data: APIDMChannel): DMChannel {
	let recipients: User[] | undefined;

	return {
		...createBaseChannel(client, data),
		...createTextBasedChannelSingleton(client, data),

		get recipients() {
			if (!data.recipients) {
				return undefined;
			}

			if (!recipients) {
				recipients = data.recipients.map((x) => createUser(client, x));
			}

			return recipients;
		},
	};
}

export function createPublicThreadChannel(client: Client, data: APIPublicThreadChannel): PublicThreadChannel {
	return {
		...createBaseChannel(client, data),
		...createThreadBasedChannelSingleton(client, data),
	};
}

export function createPrivateThreadChannel(client: Client, data: APIPrivateThreadChannel): PrivateThreadChannel {
	return {
		...createBaseChannel(client, data),
		...createThreadBasedChannelSingleton(client, data),
	};
}

export function createVoiceChannel(client: Client, data: APIGuildTextChannel<ChannelType.GuildVoice>): VoiceChannel {
	return {
		...createBaseChannel(client, data),
		...createVoiceBasedChannelSingleton(client, data),
		...createGuildBasedChannelSingleton(data),
		...createTextBasedChannelSingleton(client, data),
	};
}

export function createStageChannel(
	client: Client,
	data: APIGuildTextChannel<ChannelType.GuildStageVoice>,
): StageChannel {
	return {
		...createBaseChannel(client, data),
		...createVoiceBasedChannelSingleton(client, data),
		...createGuildBasedChannelSingleton(data),
		...createTextBasedChannelSingleton(client, data),
	};
}

export function createTextBasedChannelSingleton(
	client: Client,
	data: APITextBasedChannel<TextChannelType>,
): TextBasedChannelSingleton {
	return {
		get lastMessageId() {
			return data.last_message_id ?? undefined;
		},

		async send(options) {
			return client.helpers.channel.createMessage(data.id, options);
		},
	};
}

export function createVoiceBasedChannelSingleton(
	_client: Client,
	_data: APIChannelBase<ChannelType.GuildVoice> | APIChannelBase<ChannelType.GuildStageVoice>,
): VoiceBasedChannelSingleton {
	return {
		async join() {},
	};
}

export function createGuildBasedChannelSingleton(data: APIGuildChannel): GuildBasedChannelSingleton {
	return {
		get name() {
			return data.name;
		},

		get guildId() {
			return data.guild_id;
		},

		get parentId() {
			return data.parent_id ?? undefined;
		},
	};
}

export function createGuildTextBasedChannelSingleton(
	client: Client,
	data: APIGuildTextChannel<GuildTextChannelType>,
): GuildTextBasedChannelSingleton {
	return {
		...createGuildBasedChannelSingleton(data),
		...createTextBasedChannelSingleton(client, data),
	};
}

export function createThreadBasedChannelSingleton(client: Client, data: APIThreadChannel): ThreadBasedChannelSingleton {
	return {
		...createGuildTextBasedChannelSingleton(client, data as APIGuildTextChannel<GuildTextChannelType>),

		get messageCount() {
			return data.message_count;
		},

		get memberCount() {
			return data.member_count;
		},

		get ownerId() {
			return data.owner_id;
		},

		get totalMessageSent() {
			return data.total_message_sent;
		},

		get appliedTags() {
			return data.applied_tags;
		},
	};
}
