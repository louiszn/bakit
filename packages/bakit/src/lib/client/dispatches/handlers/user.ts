import { GatewayDispatchEvents } from "discord-api-types/v10";
import { registerHandler } from "../registry.js";
import { User } from "@/lib/structures/User.js";

registerHandler(GatewayDispatchEvents.UserUpdate, async (client, payload) => {
	if (payload.d.id === client.user?.id) {
		client.user._patch(payload.d);
	}

	let user: User;

	if (client.cache.isModuleEnabled("users")) {
		user = await client.cache.resolve(
			client.cache.users,
			payload.d.id,
			() => new User(client, payload.d),
			(user) => user._patch(payload.d),
		);
	} else {
		user = new User(client, payload.d);
	}

	client.emit("userUpdate", user);
});
