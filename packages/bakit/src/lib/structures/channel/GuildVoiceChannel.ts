import { applyMixins } from "tiny-mixin";
import { BaseChannel } from "./BaseChannel.js";
import { GuildChannelMixin, TextBasedChannelMixin, VoiceBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";
import type { APIGuildVoiceChannel } from "discord-api-types/v10";

export class GuildVoiceChannel extends applyMixins(BaseChannel<APIGuildVoiceChannel>, [
	GuildChannelMixin,
	TextBasedChannelMixin,
	VoiceBasedChannelMixin,
]) {}
