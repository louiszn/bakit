import { BaseStructure } from "./BaseStructure.js";

import type { Client } from "../client/Client.js";
import type { APIGuild, GatewayGuildCreateDispatchData, GatewayGuildUpdateDispatchData } from "discord-api-types/v10";

export type GuildPayload = APIGuild | GatewayGuildUpdateDispatchData | GatewayGuildCreateDispatchData;

export class Guild extends BaseStructure {
	#data: GuildPayload;

	public constructor(client: Client, data: GuildPayload) {
		super(client);

		this.#data = data;
	}

	public get id() {
		return this.#data.id;
	}

	public get name() {
		return this.#data.name;
	}

	public get icon() {
		return this.#data.icon;
	}

	public get banner() {
		return this.#data.banner;
	}

	public get owner() {
		return this.#data.owner_id;
	}

	public get mfaLevel() {
		return this.#data.mfa_level;
	}

	public get verificationLevel() {
		return this.#data.verification_level;
	}

	protected _patch(data: Partial<GuildPayload>) {
		this.#data = { ...this.#data, ...data };
	}

	// public get roles() {
	// 	return this.#data.roles;
	// }
}
