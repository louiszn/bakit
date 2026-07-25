import { ClientEvent, useListener } from "../../src";

export const messageCreate = useListener({
	event: ClientEvent.MessageCreate,
	async execute(event) {
		const message = await event.message.resolve();
		const author = await event.author.resolve();

		if (author.bot) {
			return;
		}

		if (message.content.startsWith("!ping")) {
			await message.reply("Pong!");
		}
	},
});
