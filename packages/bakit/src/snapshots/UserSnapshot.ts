import type { APIUser } from "discord-api-types/v10";

import { BaseSnapshot } from "./Snapshot";

export class UserSnapshot extends BaseSnapshot<APIUser> {
	get bot() {
		return Boolean(this.raw.bot);
	}

	get username() {
		return this.raw.username;
	}

	get globalName() {
		return this.raw.global_name;
	}

	get displayName() {
		return this.globalName ?? this.username;
	}
}
