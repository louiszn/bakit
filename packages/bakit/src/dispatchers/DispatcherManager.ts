import { BakitClient } from "../BakitClient.js";
import { CommandDispatcher } from "./CommandDispatcher.js";

export class DispatcherManager {
	public command: CommandDispatcher;

	public constructor(public client: BakitClient) {
		this.command = new CommandDispatcher(client);
	}
}
