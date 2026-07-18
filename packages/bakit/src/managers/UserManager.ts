import type { REST } from "@discordjs/rest";
import { type APIUser, Routes, type Snowflake } from "discord-api-types/v10";

import { UserRef } from "../refs";
import { SnapshotSource, UserSnapshot } from "../snapshots";
import { BaseManager } from "./BaseManager";

export class UserManager extends BaseManager<UserSnapshot, UserRef> {
	readonly rest: REST

	constructor(rest: REST) {
		super();

		this.rest = rest;
	}

	ref(id: Snowflake, current?: UserSnapshot): UserRef {
		return new UserRef(id, this, current);
	}

	async fetch(id: string): Promise<UserSnapshot> {
		const raw = (await this.rest.get(Routes.user(id))) as APIUser;
		const snapshot = new UserSnapshot(raw.id, raw, SnapshotSource.Rest, SnapshotSource.Rest);
		return snapshot;
	}
}
