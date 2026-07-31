import { ClientEvent, useListener } from "bakit";

export const ready = useListener({
	event: ClientEvent.Ready,
	async execute(event) {
		const user = await event.user.resolve();
		console.log(`Successfully logged in as ${user.tag}`);
	},
});
