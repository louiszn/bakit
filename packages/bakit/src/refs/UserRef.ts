import type { Snowflake } from "discord-api-types/globals";

import type { UserManager } from "../managers/UserManager";
import type { UserSnapshot } from "../snapshots/UserSnapshot";
import { BaseEntityRef } from "./EntityRef";

export class UserRef extends BaseEntityRef<UserSnapshot> {
	constructor(
		id: Snowflake,
		readonly users: UserManager,
		protected readonly current?: UserSnapshot,
	) {
		super(id);
	}

	protected _fetch() {
		return this.users.fetch(this.id);
	}

	protected _get() {
		return Promise.resolve(this.current ?? this.users.get(this.id));
	}
}
