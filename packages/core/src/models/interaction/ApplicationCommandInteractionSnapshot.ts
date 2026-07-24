import type { APIApplicationCommandInteraction } from "discord-api-types/v10";

import { BaseInteractionSnapshot } from "./InteractionSnapshot";

export class BaseApplicationCommandInteractionSnapshot<
	TRaw extends APIApplicationCommandInteraction = APIApplicationCommandInteraction,
> extends BaseInteractionSnapshot<TRaw> {
	get commandId() {
		return this.raw.data.id;
	}

	get commandName() {
		return this.raw.data.name;
	}

	get commandType() {
		return this.raw.data.type;
	}
}
