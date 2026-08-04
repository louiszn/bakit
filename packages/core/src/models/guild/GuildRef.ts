import type { Snowflake } from "discord-api-types/globals";

import { EntityRef } from "../EntityRef";
import type { GuildManager } from "./GuildManager";
import type { GuildSnapshot } from "./GuildSnapshot";

export class GuildRef extends EntityRef<GuildSnapshot> {
	readonly guilds: GuildManager;
	readonly current?: GuildSnapshot;

	constructor(id: Snowflake, guilds: GuildManager, current?: GuildSnapshot) {
		super(id);

		this.guilds = guilds;
		this.current = current;
	}

	fetch() {
		return this.guilds.fetch(this.id);
	}

	get() {
		return Promise.resolve(this.current);
	}
}
