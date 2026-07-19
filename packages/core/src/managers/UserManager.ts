import { type APIUser, Routes, type Snowflake } from "discord-api-types/v10";
import { UserRef } from "../refs";
import { SnapshotSource, UserSnapshot } from "../snapshots";
import { BaseManager } from "./BaseManager";

export class UserManager extends BaseManager<APIUser, UserSnapshot, UserRef> {
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
		return this.createSnapshot(raw.id, raw, SnapshotSource.Rest, SnapshotSource.Rest);
	}
}
