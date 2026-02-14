import type { Client } from "../client/Client.js";

export class BaseStructure {
	declare public client: Client<true>;

	public constructor(client: Client<true>) {
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
