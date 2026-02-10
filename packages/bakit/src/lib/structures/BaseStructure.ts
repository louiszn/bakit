import type { Client } from "../Client.js";

export class BaseStructure {
	declare public client: Client;

	public constructor(client: Client) {
		Object.defineProperty(this, "client", {
			value: client,
			enumerable: false,
			writable: false,
		});
	}

	public toJSON() {
		return {};
	}
}
