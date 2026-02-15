import { Collection } from "@discordjs/collection";
import { applyMixins } from "tiny-mixin";

import { BaseChannel } from "./BaseChannel.js";
import { User } from "../User.js";
import { TextBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";

import { Routes, type APIDMChannel, type RESTPostAPICurrentUserCreateDMChannelJSONBody } from "discord-api-types/v10";

import type { Client } from "@/lib/client/Client.js";
import type { MessageCreateOptions } from "@/lib/managers/client/ClientChannelManager.js";
import type { Message } from "../index.js";

export class DMChannel extends applyMixins(BaseChannel<APIDMChannel>, [TextBasedChannelMixin]) {
	#cachedRecipients?: Collection<string, User>;

	public constructor(client: Client, data: APIDMChannel) {
		super(client, data);
	}

	public get recipients(): Collection<string, User> {
		if (!this.#cachedRecipients) {
			this.#cachedRecipients = new Collection();

			for (const recipient of this.data.recipients ?? []) {
				let user: User;

				if (this.client.cache.isModuleEnabled("users")) {
					user = this.client.cache.resolveLocal(
						this.client.cache.users.local,
						recipient.id,
						() => new User(this.client, recipient),
						(user) => user._patch(recipient),
					);
				} else {
					user = new User(this.client, recipient);
				}

				this.#cachedRecipients.set(recipient.id, user);
			}
		}

		return this.#cachedRecipients;
	}

	public get recipientId() {
		const id = (this.data.recipients ?? []).find((user) => user.id !== this.client.user.id)?.id;

		if (!id) {
			throw new Error("No recipients found");
		}

		return id;
	}

	public get recipient() {
		const user = this.recipients.get(this.recipientId);

		if (!user) {
			throw new Error("Recipient not found");
		}

		return user;
	}

	public override async fetch(): Promise<this> {
		const data = await this.client.rest.post<APIDMChannel, RESTPostAPICurrentUserCreateDMChannelJSONBody>(
			Routes.userChannels(),
			{
				body: {
					recipient_id: this.recipientId,
				},
			},
		);

		this._patch(data);
		await this.#initRecipientsCache();

		return this;
	}

	public override send(options: MessageCreateOptions | string): Promise<Message<false>> {
		return super.send(options);
	}

	public async fetchRecipients(force = false) {
		if (!force && this.data.recipients?.length) {
			await this.#initRecipientsCache();
			return this.#cachedRecipients!;
		}

		await this.fetch();
		return this.#cachedRecipients;
	}

	async #initRecipientsCache() {
		this.#cachedRecipients = new Collection();

		for (const recipient of this.data.recipients ?? []) {
			let user: User;

			if (this.client.cache.isModuleEnabled("users")) {
				user = await this.client.cache.resolve(
					this.client.cache.users,
					recipient.id,
					() => new User(this.client, recipient),
					(user) => user._patch(recipient),
				);
			} else {
				user = new User(this.client, recipient);
			}

			this.#cachedRecipients.set(recipient.id, user);
		}
	}

	public override _patch(data: Partial<APIDMChannel>): void {
		super._patch(data);
		this.#cachedRecipients = undefined;
	}
}
