import { createUser, type User } from "@/lib/structures/user.js";
import type { Client } from "../index.js";
import type { Snowflake } from "discord-api-types/globals";
import type { APIUser } from "discord-api-types/v10";

export function createUserHelpers(client: Client) {
	return {
		async getById(id: Snowflake): Promise<User | undefined> {
			try {
				const data = await client.rest.get<APIUser>(`/users/${id}`);
				return createUser(client, data);
			} catch {
				return undefined;
			}
		},

		async getCurrent(): Promise<User> {
			const data = await client.rest.get<APIUser>("/users/@me");
			return createUser(client, data);
		},
	};
}
