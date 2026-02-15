import type { APIGuildMember } from "discord-api-types/v10";
import type { Client } from "../client/Client.js";
import { BaseStructure } from "./BaseStructure.js";

export type GuildMemberPayload = APIGuildMember;

export class Member extends BaseStructure {
	public constructor(
		client: Client,
		public data: GuildMemberPayload,
	) {
		super(client);
	}

	public get user() {
		return this.data.user;
	}

	public get nick() {
		return this.data.nick;
	}

	public get avatar() {
		return this.data.avatar;
	}

	public get banner() {
		return this.data.banner;
	}

	public get roles() {
		return this.data.roles;
	}

	public get joinedAt() {
		return this.data.joined_at;
	}

	public get premiumSince() {
		return this.data.premium_since;
	}

	public get deaf() {
		return this.data.deaf;
	}

	public get mute() {
		return this.data.mute;
	}

	public get flags() {
		return this.data.flags;
	}

	public get pending() {
		return this.data.pending;
	}

	public get communicationDisabledUntil() {
		return this.data.communication_disabled_until;
	}

	public get avatarDecorationData() {
		return this.data.avatar_decoration_data;
	}
}
