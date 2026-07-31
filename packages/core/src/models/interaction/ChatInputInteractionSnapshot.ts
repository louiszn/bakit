import type { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { applyMixins } from "tiny-mixin";

import { BaseApplicationCommandInteractionSnapshot } from "./ApplicationCommandInteractionSnapshot";
import { InteractionOptions } from "./InteractionOptions";
import { RepliableInteractionMixin } from "./mixins";

export class ChatInputInteractionSnapshot extends applyMixins(
	BaseApplicationCommandInteractionSnapshot<APIChatInputApplicationCommandInteraction>,
	[RepliableInteractionMixin],
) {
	readonly options = new InteractionOptions(this);
}
