import type { REST } from "@discordjs/rest";

import { MessageManager, UserManager } from "../managers";

export class Resources {
	readonly rest: REST;
	readonly users: UserManager;
	readonly messages: MessageManager;

	constructor(rest: REST) {
		this.rest = rest;

		this.users = new UserManager(this);
		this.messages = new MessageManager(this);
	}
}
