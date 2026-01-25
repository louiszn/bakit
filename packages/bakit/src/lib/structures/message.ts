import { type User, createUser } from "./user.js";

import type { Client } from "../client/index.js";
import type { APIMessage } from "discord-api-types/v10";
import type { GatewayMessageCreateDispatchData } from "discord-api-types/v9";

export interface Message {
	readonly client: Client;

	readonly id: string;
	readonly channelId: string;
	readonly guildId?: string;

	readonly author: User;

	readonly content: string;

	readonly timestamp: string;
	readonly editedTimestamp?: string;

	readonly tts: boolean;
	readonly mentionEveryone: boolean;

	readonly mentions: readonly User[];
	readonly mentionRoles: readonly string[];

	readonly nonce?: string | number;

	readonly pinned: boolean;

	readonly webhookId?: string;

	readonly type: number;

	readonly applicationId?: string;

	readonly flags?: number;

	readonly referencedMessage?: Message;

	readonly position?: number;
}

export function createMessage(client: Client, data: APIMessage | GatewayMessageCreateDispatchData): Message {
	let author: User | undefined;
	let mentions: User[] | undefined;
	let referencedMessage: Message | undefined;

	return {
		get client() {
			return client;
		},

		get id() {
			return data.id;
		},

		get channelId() {
			return data.channel_id;
		},

		get guildId() {
			if ("guild_id" in data) {
				return data.guild_id;
			}

			return undefined;
		},

		get author() {
			if (!author) {
				author = createUser(client, data.author);
			}

			return author;
		},

		get content() {
			return data.content;
		},

		get timestamp() {
			return data.timestamp;
		},

		get editedTimestamp() {
			return data.edited_timestamp ?? undefined;
		},

		get tts() {
			return data.tts;
		},

		get mentionEveryone() {
			return data.mention_everyone;
		},

		get mentions() {
			if (!mentions) {
				mentions = data.mentions.map((x) => createUser(client, x));
			}

			return mentions;
		},

		get mentionRoles() {
			return data.mention_roles;
		},

		get nonce() {
			return data.nonce;
		},

		get pinned() {
			return data.pinned;
		},

		get webhookId() {
			return data.webhook_id;
		},

		get type() {
			return data.type;
		},

		get applicationId() {
			return data.application_id;
		},

		get flags() {
			return data.flags;
		},

		get referencedMessage() {
			if (!data.referenced_message) {
				return undefined;
			}

			if (!referencedMessage) {
				referencedMessage = createMessage(client, data.referenced_message);
			}

			return referencedMessage;
		},

		get position() {
			return data.position;
		},
	};
}
