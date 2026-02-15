import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin } from "@/lib/mixins/ChannelMixin.js";
import { applyMixins } from "tiny-mixin";
import type { APIGuildCategoryChannel } from "discord-api-types/v10";
import type { Client } from "@/lib/client/Client.js";

export class GuildCategory extends applyMixins(BaseChannel<APIGuildCategoryChannel>, [GuildChannelMixin]) {
	public constructor(client: Client, data: APIGuildCategoryChannel) {
		super(client, data);
	}

	public get children() {
		return this.guild?.channels.filter((channel) => channel.inGuild() && channel.parentId === this.id);
	}
}
