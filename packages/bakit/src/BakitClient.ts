import { Awaitable, Client, ClientOptions, Events, IntentsBitField, Message } from "discord.js";

import { ListenerRegistry } from "./listener/ListenerRegistry.js";

import { defaultGetSyntaxErrorMessage, GetSyntaxErrorMessageFunction } from "./utils/command.js";
import { DispatcherManager } from "./dispatchers/DispatcherManager.js";

export type GetPrefixFunction = (message: Message) => Awaitable<string[] | string>;

export interface BakitClientOptions extends ClientOptions {
	prefixes?: (string | GetPrefixFunction)[];
	enableMentionPrefix?: boolean;
	getSyntaxErrorMessage?: GetSyntaxErrorMessageFunction | null;
}

export class BakitClient<Ready extends boolean = boolean> extends Client<Ready> {
	declare public options: Omit<BakitClientOptions, "intents"> & { intents: IntentsBitField };

	public dispatchers: DispatcherManager;

	public constructor(options: BakitClientOptions) {
		if (options.getSyntaxErrorMessage === undefined) {
			options.getSyntaxErrorMessage = defaultGetSyntaxErrorMessage;
		}

		super(options);

		ListenerRegistry["setClient"](this);

		this.dispatchers = new DispatcherManager(this);

		this.initializeHandlers();
	}

	public override isReady(): this is BakitClient<true> {
		return super.isReady();
	}

	private initializeHandlers() {
		this.on(
			Events.MessageCreate,
			(message) => void this.dispatchers.command.handleMessage(message),
		);

		this.on(Events.InteractionCreate, (interaction) => {
			if (interaction.isChatInputCommand()) {
				void this.dispatchers.command.handleChatInput(interaction);
			}
		});
	}
}
