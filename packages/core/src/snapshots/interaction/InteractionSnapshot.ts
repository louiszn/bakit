import type { Snowflake } from "discord-api-types/globals";
import {
	type APIInteraction,
	ApplicationCommandType,
	InteractionType,
} from "discord-api-types/v10";

import { BaseSnapshot } from "../Snapshot";
import type { BaseApplicationCommandInteractionSnapshot } from "./ApplicationCommandInteractionSnapshot";
import type { ChatInputInteractionSnapshot } from "./ChatInputInteractionSnapshot";

export class BaseInteractionSnapshot<
	TRaw extends APIInteraction = APIInteraction,
> extends BaseSnapshot<TRaw> {
	get applicationId(): Snowflake {
		return this.raw.application_id;
	}

	get type(): TRaw["type"] {
		return this.raw.type;
	}

	get token(): string {
		return this.raw.token;
	}

	get version(): 1 {
		return this.raw.version;
	}

	get guildId(): Snowflake | undefined {
		return this.raw.guild_id;
	}

	get channelId(): Snowflake | undefined {
		return this.raw.channel?.id ?? this.raw.channel_id;
	}

	get context() {
		return this.raw.context;
	}

	get locale() {
		return "locale" in this.raw ? this.raw.locale : undefined;
	}

	get guildLocale() {
		return this.raw.guild_locale;
	}

	get appPermissions() {
		return this.raw.app_permissions;
	}

	get attachmentSizeLimit(): number {
		return this.raw.attachment_size_limit;
	}

	get entitlements() {
		return this.raw.entitlements;
	}

	get authorizingIntegrationOwners() {
		return this.raw.authorizing_integration_owners;
	}

	isApplicationCommand(): this is ApplicationCommandInteractionSnapshot {
		return this.type === InteractionType.ApplicationCommand;
	}

	isChatInputCommand(): this is ChatInputInteractionSnapshot {
		return this.isApplicationCommand() && this.commandType === ApplicationCommandType.ChatInput;
	}
}

export type InteractionSnapshot = ChatInputInteractionSnapshot | BaseInteractionSnapshot;
export type ApplicationCommandInteractionSnapshot =
	| ChatInputInteractionSnapshot
	| BaseApplicationCommandInteractionSnapshot;
