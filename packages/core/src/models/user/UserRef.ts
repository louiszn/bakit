import type { Snowflake } from "discord-api-types/globals";

import { BaseEntityRef } from "../EntityRef";
import type { UserManager } from "./UserManager";
import type { UserSnapshot } from "./UserSnapshot";

export class UserRef extends BaseEntityRef<UserSnapshot> {
	readonly users: UserManager;
	readonly current?: UserSnapshot;

	constructor(id: Snowflake, users: UserManager, current?: UserSnapshot) {
		super(id);

		this.users = users;
		this.current = current;
	}

	fetch() {
		return this.users.fetch(this.id);
	}

	get() {
		return Promise.resolve(this.current);
	}
}
