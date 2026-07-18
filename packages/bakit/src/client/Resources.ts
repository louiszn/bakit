import type { REST } from "@discordjs/rest";

import { UserManager } from "../managers";

export class Resources {
	readonly users: UserManager;
	readonly rest: REST

	constructor(rest: REST) {
		this.rest = rest;

		this.users = new UserManager(rest);
	}
}
