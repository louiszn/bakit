import { ClientEvent, useListener } from "../../src";

export const messageCreate = useListener({
	event: ClientEvent.MessageCreate,
	async onMain(event) {
		const message = await event.message.resolve(true);
		const author = await event.author.resolve(true);

		if (author.bot) {
			return;
		}

		if (message.content.startsWith("!ping")) {
			await message.reply("Pong!");
		}
	},
});
