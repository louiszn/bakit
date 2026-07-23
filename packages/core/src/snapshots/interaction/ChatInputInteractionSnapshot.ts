import type { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { applyMixins } from "tiny-mixin";

import { BaseApplicationCommandInteractionSnapshot } from "./ApplicationCommandInteractionSnapshot";
import { RepliableInteractionMixin } from "./mixins";

export class ChatInputInteractionSnapshot extends applyMixins(
	BaseApplicationCommandInteractionSnapshot<APIChatInputApplicationCommandInteraction>,
	[RepliableInteractionMixin],
) {
	get options() {
		return this.raw.data.options ?? [];
	}
}
