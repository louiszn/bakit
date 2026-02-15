import { getSnowflakeDate } from "@bakit/utils";
import { BaseStructure } from "./BaseStructure.js";

import type { Client } from "../client/Client.js";
import type { APIUser, GatewayReadyDispatchData } from "discord-api-types/v10";
import type { MessageCreateOptions } from "../managers/client/ClientChannelManager.js";

export type UserPayload = APIUser | GatewayReadyDispatchData["user"];

export class User extends BaseStructure {
	public constructor(
		client: Client,
		public data: UserPayload,
	) {
		super(client);
	}

	public get id() {
		return this.data.id;
	}

	public get username() {
		return this.data.username;
	}

	public get discriminator() {
		return this.data.discriminator;
	}

	public get globalName() {
		return this.data.global_name;
	}

	public get tag() {
		const hasDiscriminator = this.discriminator !== "0" && this.discriminator !== "0000";
		return hasDiscriminator ? `${this.username}#${this.discriminator}` : this.username;
	}

	public get displayName() {
		return this.globalName ?? this.tag;
	}

	public get avatar() {
		return this.data.avatar ?? undefined;
	}

	public get bot() {
		return !!this.data.bot;
	}

	public get system() {
		return !!this.data.system;
	}

	public get mfaEnabled() {
		return this.data.mfa_enabled;
	}

	public get locale() {
		return this.data.locale;
	}

	public get verified() {
		return this.data.verified;
	}

	public get email() {
		return this.data.email;
	}

	public get flags() {
		return this.data.flags;
	}

	public get premiumType() {
		return this.data.premium_type;
	}

	public get publicFlags() {
		return this.data.public_flags;
	}

	public get banner() {
		return this.data.banner;
	}

	public get accentColor() {
		return this.data.accent_color ?? undefined;
	}

	public get createdAt() {
		return getSnowflakeDate(this.id);
	}

	public get createdTimestamp() {
		return this.createdAt.getTime();
	}

	public get hexAccentColor() {
		return this.accentColor !== undefined ? `#${this.accentColor.toString(16).padStart(6, "0")}` : undefined;
	}

	public get defaultAvatarURL() {
		// For users on the new username system, index will be (user_id >> 22) % 6.
		// For users on the legacy username system, index will be discriminator % 5.
		const hasDiscriminator = this.discriminator !== "0" && this.discriminator !== "0000";
		const index = hasDiscriminator ? BigInt(this.discriminator) % 5n : (BigInt(this.id) >> 22n) % 6n;

		return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
	}

	public getAvatarURL(options?: { size?: number; extension?: "png" | "jpg" | "webp" | "gif" }): string | undefined {
		if (!this.avatar) {
			return undefined;
		}

		const isAnimated = this.avatar.startsWith("a_");
		const ext = options?.extension ?? (isAnimated ? "gif" : "png");

		const size = options?.size ? `?size=${options.size}` : "";

		return `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.${ext}${size}`;
	}

	public getDisplayAvatarURL(options?: { size?: number; extension?: "png" | "jpg" | "webp" | "gif" }) {
		return this.getAvatarURL(options) ?? this.defaultAvatarURL;
	}

	public equals(other: User | string) {
		if (typeof other === "string") {
			return other === this.id;
		}

		return (
			other.id === this.id &&
			other.username === this.username &&
			other.discriminator === this.discriminator &&
			other.bot === this.bot &&
			other.createdTimestamp === this.createdTimestamp
		);
	}

	public async createDM(force = false) {
		return this.client.helper.createDM(this.id, force);
	}

	public async send(options: MessageCreateOptions | string) {
		const dm = await this.createDM();
		return await dm.send(options);
	}

	public _patch(data: Partial<UserPayload>) {
		this.data = { ...this.data, ...data };
	}

	public override toJSON() {
		return this.data;
	}

	public override toString() {
		return `<@${this.id}>`;
	}
}
