import type { Snowflake } from "discord-api-types/globals";

export abstract class EntityRef<TSnapshot> {
	readonly id: Snowflake;

	constructor(id: Snowflake) {
		this.id = id;
	}

	abstract fetch(): Promise<TSnapshot>;
	abstract get(): Promise<TSnapshot | undefined>;

	async resolve(): Promise<TSnapshot> {
		return (await this.get()) ?? this.fetch();
	}
}
