import type { Snowflake } from "discord-api-types/globals";

export interface EntityRef<TSnapshot> {
	readonly id: Snowflake;

	fetch(): Promise<TSnapshot>;
	get(): Promise<TSnapshot | undefined>;
	resolve(): Promise<TSnapshot>;
}

export interface EntitySource<TSnapshot> {
	fetch(id: Snowflake): Promise<TSnapshot>;
	get(id: Snowflake): Promise<TSnapshot | undefined>;
}

export abstract class BaseEntityRef<TSnapshot> implements EntityRef<TSnapshot> {
	readonly id: string;

	constructor(id: string) {
		this.id = id;
	}

	abstract fetch(): Promise<TSnapshot>;
	abstract get(): Promise<TSnapshot | undefined>;

	async resolve(): Promise<TSnapshot> {
		return (await this.get()) ?? this.fetch();
	}
}
