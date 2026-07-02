import type { Snowflake } from "discord-api-types/globals";
import type { UserSnapshot } from "../snapshots/UserSnapshot";
import { BaseEntityRef } from "./EntityRef";

export class UserRef extends BaseEntityRef<UserSnapshot> {
	constructor(id: Snowflake, protected readonly current?: UserSnapshot) {
		super(id);
	}

	protected override _fetch(): Promise<UserSnapshot> {
		throw new Error("Method not implemented.");
	}

	protected override _get(): Promise<UserSnapshot | undefined> {
		throw new Error("Method not implemented.");
	}
}
