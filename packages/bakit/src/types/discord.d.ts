import { BakitClient } from "../BakitClient.ts";

declare module "discord.js" {
	interface Message {
		client: BakitClient<true>;
	}
}

export {};
