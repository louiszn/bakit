import { getSnowflakeDate } from "@bakit/utils";
import { BaseStructure } from "./BaseStructure.js";

import type { Client } from "../Client.js";
import type { APIUser, GatewayReadyDispatchData } from "discord-api-types/v10";

export type UserPayload = APIUser | GatewayReadyDispatchData["user"];

export class User extends BaseStructure {
	#data: UserPayload;

	public constructor(client: Client, user: UserPayload) {
		super(client);
		this.#data = user;
	}

	public get id() {
		return this.#data.id;
	}

	public get username() {
		return this.#data.username;
	}

	public get discriminator() {
		return this.#data.discriminator;
	}

	public get tag() {
		const hasDiscriminator = this.discriminator !== "0" && this.discriminator !== "0000";
		return hasDiscriminator ? `${this.username}#${this.discriminator}` : this.username;
	}

	public get avatar() {
		return this.#data.avatar;
	}

	public get bot() {
		return !!this.#data.bot;
	}

	public get system() {
		return !!this.#data.system;
	}

	public get mfaEnabled() {
		return this.#data.mfa_enabled;
	}

	public get locale() {
		return this.#data.locale;
	}

	public get verified() {
		return this.#data.verified;
	}

	public get email() {
		return this.#data.email;
	}

	public get flags() {
		return this.#data.flags;
	}

	public get premiumType() {
		return this.#data.premium_type;
	}

	public get publicFlags() {
		return this.#data.public_flags;
	}

	public get banner() {
		return this.#data.banner;
	}

	public get accentColor() {
		return this.#data.accent_color;
	}

	public get createdAt() {
		return getSnowflakeDate(this.id);
	}

	public get createdTimestamp() {
		return this.createdAt.getTime();
	}

	public get hexAccentColor() {
		return this.accentColor ? `#${this.accentColor.toString(16).padStart(6, "0")}` : undefined;
	}

	public override toJSON() {
		return this.#data;
	}

	public override toString() {
		return `<@${this.id}>`;
	}
}
