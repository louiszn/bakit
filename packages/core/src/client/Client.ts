import { REST } from "@discordjs/rest";
import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";
import { GatewayVersion } from "discord-api-types/v10";

import type { Intent } from "../constants";
import { GatewayManager } from "../gateway";
import { resolveFlags } from "../utils";
import type { ClientEvents } from "./ClientEvents";
import { Resources } from "./Resources";

export interface ClientOptions {
	token: string;
	intents: number | Intent | readonly Intent[];
}

export class Client extends AsyncEventEmitter<ClientEvents> {
	readonly options: Omit<ClientOptions, "intents"> & { intents: number };
	readonly rest: REST;
	readonly resources: Resources;
	readonly gateway: GatewayManager;

	constructor(options: ClientOptions) {
		super();

		this.options = {
			...options,
			intents: resolveFlags(options.intents),
		};

		this.rest = new REST({ version: GatewayVersion }).setToken(options.token);
		this.resources = new Resources(this.rest);

		this.gateway = new GatewayManager(this, {
			token: this.options.token,
			intents: this.options.intents,
			rest: this.rest,
		});
	}

	start() {
		return this.gateway.start();
	}

	stop() {
		return this.gateway.stop();
	}
}
