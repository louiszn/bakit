import { BaseStructure } from "./BaseStructure.js";
import { User } from "./User.js";

import type { Client } from "../Client.js";
import type {
	APIMessage,
	GatewayMessageCreateDispatchData,
	GatewayMessageUpdateDispatchData,
} from "discord-api-types/v10";
import type { MessageReplyOptions } from "../ClientHelper.js";

export type MessagePayload = APIMessage | GatewayMessageCreateDispatchData | GatewayMessageUpdateDispatchData;

export class Message extends BaseStructure {
	#data: MessagePayload;
	#user?: User;

	public constructor(client: Client, data: MessagePayload) {
		super(client);
		this.#data = data;
	}

	public get partial() {
		return typeof this.#data.content !== "string" || typeof this.#data.author !== "object";
	}

	public get content() {
		return this.#data.content;
	}

	public get id() {
		return this.#data.id;
	}

	public get channelId() {
		return this.#data.channel_id;
	}

	public get guildId() {
		return "guild_id" in this.#data ? this.#data.guild_id : undefined;
	}

	public get author() {
		this.#user ??= new User(this.client, this.#data.author);
		return this.#user;
	}

	public get createdAt() {
		return new Date(this.#data.timestamp);
	}

	public get editedAt() {
		return this.#data.edited_timestamp ? new Date(this.#data.edited_timestamp) : undefined;
	}

	public get createdTimestamp() {
		return this.createdAt.getTime();
	}

	public get editedTimestamp() {
		return this.editedAt?.getTime();
	}

	public get url() {
		return `https://discord.com/channels/${this.guildId ?? "@me"}/${this.channelId}/${this.id}`;
	}

	public async fetch(): Promise<Message> {
		const message = await this.client.helper.fetchMessage(this.channelId, this.id);
		this.#data = message.#data;
		this.#user = message.#user;
		return this;
	}

	public async reply(options: MessageReplyOptions) {
		return this.client.helper.replyMessage(this.channelId, this.id, options);
	}

	public override toJSON() {
		return this.#data;
	}

	public override toString() {
		return this.#data.content;
	}
}
