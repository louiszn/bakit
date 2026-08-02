import { type APIUser, Routes, type Snowflake } from "discord-api-types/v10";

import { EntityManager } from "../EntityManager";
import { SnapshotSource } from "../Snapshot";
import { UserRef } from "./UserRef";
import { UserSnapshot } from "./UserSnapshot";

export class UserManager extends EntityManager<APIUser, UserSnapshot, UserRef> {
	createSnapshot(
		id: Snowflake,
		raw: APIUser,
		source: SnapshotSource,
		receivedAt = Date.now(),
	): UserSnapshot {
		return new UserSnapshot(this.resources, id, raw, source, receivedAt);
	}

	ref(id: Snowflake, current?: UserSnapshot): UserRef {
		return new UserRef(id, this, current);
	}

	async fetch(id: string): Promise<UserSnapshot> {
		const raw = (await this.resources.rest.get(Routes.user(id))) as APIUser;
		return this.createSnapshot(raw.id, raw, SnapshotSource.Rest);
	}
}
