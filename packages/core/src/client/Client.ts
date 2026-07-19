import { REST } from "@discordjs/rest";
import { AsyncEventEmitter } from "@vladfrangu/async_event_emitter";
import { type GatewayIntentBits, GatewayVersion } from "discord-api-types/v10";

import { GatewayManager } from "../gateway";
import type { ClientEvents } from "./ClientEvents";
import { Resources } from "./Resources";

export type IntentsResolvable = GatewayIntentBits | readonly GatewayIntentBits[];

export interface ClientOptions {
	token: string;
	intents: IntentsResolvable;
}

export function resolveIntents(intents: IntentsResolvable): GatewayIntentBits {
	return Array.isArray(intents)
		? intents.reduce((value, intent) => value | intent, 0)
		: (intents as GatewayIntentBits);
}

export class Client extends AsyncEventEmitter<ClientEvents> {
	readonly options: Omit<ClientOptions, "intents"> & { intents: GatewayIntentBits };
	readonly rest: REST;
	readonly resources: Resources;
	readonly gateway: GatewayManager;

	constructor(options: ClientOptions) {
		super();

		this.options = {
			...options,
			intents: resolveIntents(options.intents),
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
