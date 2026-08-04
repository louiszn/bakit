import { Collection } from "@discordjs/collection";
import { type APIGuild, Routes, type Snowflake } from "discord-api-types/v10";

import type { GuildState } from "#/constants";

import { EntityManager } from "../EntityManager";
import { SnapshotSource } from "../Snapshot";
import { GuildRef } from "./GuildRef";
import { GuildSnapshot } from "./GuildSnapshot";

export class GuildManager extends EntityManager<APIGuild, GuildSnapshot, GuildRef> {
	readonly states = new Collection<Snowflake, GuildState>();

	createSnapshot(
		id: Snowflake,
		raw: APIGuild,
		source: SnapshotSource,
		receivedAt = Date.now(),
	): GuildSnapshot {
		return new GuildSnapshot(this.resources, id, raw, source, receivedAt);
	}

	ref(id: Snowflake, current?: GuildSnapshot): GuildRef {
		return new GuildRef(id, this, current);
	}

	async fetch(id: string): Promise<GuildSnapshot> {
		const raw = (await this.resources.rest.get(Routes.guild(id))) as APIGuild;
		return this.createSnapshot(raw.id, raw, SnapshotSource.Rest);
	}
}
