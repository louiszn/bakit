import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin, TextBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";
import { applyMixins } from "tiny-mixin";

import type { APIGuildTextChannel, GuildTextChannelType } from "discord-api-types/v10";

export class GuildTextChannel extends applyMixins(BaseChannel<APIGuildTextChannel<GuildTextChannelType>>, [
	GuildChannelMixin,
	TextBasedChannelMixin,
]) {}
