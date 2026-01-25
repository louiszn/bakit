import type { APIUser } from "discord-api-types/v10";
import type { Client } from "../client/index.js";

export interface User {
	readonly client: Client;

	readonly id: string;
	readonly username: string;
	readonly discriminator: string;
	readonly globalName?: string | null;

	readonly avatar?: string | null;
	readonly system?: boolean;

	readonly mfaEnabled?: boolean;

	readonly banner?: string | null;
	readonly accentColor?: number;

	readonly locale?: string;
	readonly verified?: boolean;
	readonly email?: string | null;

	readonly flags?: number;
	readonly premiumType?: number;
	readonly publicFlags?: number;

	// avatarDecorationData?: AvatarDecorationData | null;
	// collectibles?: Collectibles | null;
	// primaryGuild?: UserPrimaryGuild | null;
}

export function createUser(client: Client, data: APIUser): User {
	const user: User = {
		get client() {
			return client;
		},

		get id() {
			return data.id;
		},

		get username() {
			return data.username;
		},

		get discriminator() {
			return data.discriminator;
		},

		get globalName() {
			return data.global_name;
		},

		get avatar() {
			return data.avatar;
		},

		get system() {
			return data.system;
		},

		get mfaEnabled() {
			return data.mfa_enabled;
		},

		get banner() {
			return data.banner;
		},

		get accentColor() {
			return data.accent_color ?? undefined;
		},

		get locale() {
			return data.locale;
		},

		get verified() {
			return data.verified;
		},

		get email() {
			return data.email;
		},

		get flags() {
			return data.flags;
		},

		get premiumType() {
			return data.premium_type;
		},

		get publicFlags() {
			return data.public_flags;
		},
	};

	return user;
}
