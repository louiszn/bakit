import type { Client } from "../index.js";
import { createChannelHelpers } from "./channel.js";
import { createUserHelpers } from "./user.js";

export function createHelpers(client: Client) {
	return {
		user: createUserHelpers(client),
		channel: createChannelHelpers(client),
	};
}
