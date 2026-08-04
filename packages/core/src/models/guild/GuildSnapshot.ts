import type { APIGuild } from "discord-api-types/v10";

import { Snapshot } from "../Snapshot";

export class GuildSnapshot extends Snapshot<APIGuild> {
	get name() {
		return this.raw.name;
	}
}
