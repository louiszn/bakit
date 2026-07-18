import type { Snowflake } from "discord-api-types/globals";

export interface EntityRef<TSnapshot> {
	readonly id: Snowflake;

	fetch(): Promise<TSnapshot>;

	get(required: true): Promise<TSnapshot>;
	get(required?: false): Promise<TSnapshot | undefined>;
	get(required?: boolean): Promise<TSnapshot | undefined>;

	resolve(required: true): Promise<TSnapshot>;
	resolve(required?: false): Promise<TSnapshot | undefined>;
	resolve(required?: boolean): Promise<TSnapshot | undefined>;
}

export abstract class BaseEntityRef<TSnapshot> implements EntityRef<TSnapshot> {
	readonly id: string;

	constructor(id: string) {
		this.id = id;
	}

	protected abstract _fetch(): Promise<TSnapshot>;
	protected abstract _get(): Promise<TSnapshot | undefined>;

	fetch(): Promise<TSnapshot> {
		return this._fetch();
	}

	get(required: true): Promise<TSnapshot>;
	get(required?: false): Promise<TSnapshot | undefined>;
	get(required?: boolean): Promise<TSnapshot | undefined>;
	async get(required?: boolean): Promise<TSnapshot | undefined> {
		const snapshot = await this._get();

		if (snapshot === undefined && required) {
			throw new Error(`Entity ${this.id} could not be found`);
		}

		return snapshot;
	}

	resolve(required: true): Promise<TSnapshot>;
	resolve(required?: false): Promise<TSnapshot | undefined>;
	resolve(required?: boolean): Promise<TSnapshot | undefined>;
	async resolve(required?: boolean): Promise<TSnapshot | undefined> {
		const cached = await this.get();

		if (cached !== undefined) {
			return cached;
		}

		try {
			return await this.fetch();
		} catch (error) {
			if (required) {
				throw error;
			}

			return undefined;
		}
	}
}
