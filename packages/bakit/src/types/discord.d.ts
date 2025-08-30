/**
 * This file is used to redeclare original client to the custom one
 * Most of the structure is from Base, but some might be not
 */
import { BakitClient } from "../BakitClient.ts";

declare module "discord.js" {
	interface Base {
		client: BakitClient<true>;
	}
}

export {};
