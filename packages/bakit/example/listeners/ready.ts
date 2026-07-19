import { ClientEvent, useListener } from "../../src";

export const ready = useListener({
	event: ClientEvent.Ready,
	async onMain(event) {
		const user = await event.user.resolve(true);

		console.log(`Successfully logged in as ${user.tag}`);
	},
});
