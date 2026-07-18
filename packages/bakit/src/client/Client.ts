import { REST } from "@discordjs/rest";
import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";
import { type GatewayIntentBits, GatewayVersion } from "discord-api-types/v10";

import { GatewayManager } from "../gateway";
import type { ClientEvents } from "./ClientEvents";
import { Resources } from "./Resources";

export interface ClientOptions {
	token: string;
	intents: GatewayIntentBits;
}

export class Client extends AsyncEventEmitter<ClientEvents> {
	readonly options: ClientOptions;
	readonly rest: REST;
	readonly resources: Resources;
	readonly gateway: GatewayManager;

	constructor(options: ClientOptions) {
		super();

		this.options = options;

		this.rest = new REST({ version: GatewayVersion }).setToken(options.token);
		this.resources = new Resources(this.rest);

		this.gateway = new GatewayManager(this, {
			token: options.token,
			intents: options.intents,
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
