import {
	type APIChatInputApplicationCommandInteraction,
	type APIInteraction,
	ApplicationCommandType,
	InteractionType,
} from "discord-api-types/v10";

import type { Resources } from "../client";
import type { SnapshotSource } from "../snapshots";
import { BaseInteractionSnapshot, ChatInputInteractionSnapshot } from "../snapshots/interaction";

export function createInteractionSnapshot(
	resources: Resources,
	raw: APIInteraction,
	source: SnapshotSource,
): BaseInteractionSnapshot {
	switch (raw.type) {
		case InteractionType.ApplicationCommand: {
			if (raw.data.type === ApplicationCommandType.ChatInput) {
				return new ChatInputInteractionSnapshot(
					resources,
					raw.id,
					raw as APIChatInputApplicationCommandInteraction,
					source,
				);
			}

			break;
		}
	}

	return new BaseInteractionSnapshot(resources, raw.id, raw, source);
}
