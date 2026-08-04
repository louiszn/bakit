import type { REST } from "@discordjs/rest";

import { GuildManager, MessageManager, UserManager } from "#/models";

export class Resources {
	readonly rest: REST;
	readonly users: UserManager;
	readonly messages: MessageManager;
	readonly guilds: GuildManager;

	constructor(rest: REST) {
		this.rest = rest;

		this.users = new UserManager(this);
		this.messages = new MessageManager(this);
		this.guilds = new GuildManager(this);
	}
}
