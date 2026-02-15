import { applyMixins } from "tiny-mixin";

import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin, TextBasedChannelMixin, VoiceBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";

import type { APIGuildStageVoiceChannel } from "discord-api-types/v10";

export class GuildStageVoiceChannel extends applyMixins(BaseChannel<APIGuildStageVoiceChannel>, [
	GuildChannelMixin,
	TextBasedChannelMixin,
	VoiceBasedChannelMixin,
]) {}
