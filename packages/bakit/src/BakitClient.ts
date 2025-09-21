import {
	Awaitable,
	Client,
	ClientEvents,
	ClientOptions,
	Events,
	IntentsBitField,
	Message,
} from "discord.js";

import { ListenerRegistry } from "./listener/ListenerRegistry.js";
import { CommandRegistry } from "./command/CommandRegistry.js";

import { defaultGetSyntaxErrorMessage, GetSyntaxErrorMessageFunction } from "./utils/command.js";
import { DispatcherManager } from "./dispatchers/DispatcherManager.js";

export type GetPrefixFunction = (message: Message) => Awaitable<string[] | string>;

export interface BakitClientEvents extends ClientEvents {
	ready: [BakitClient<true>];
	clientReady: [BakitClient<true>];
}

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

		this.on(Events.ClientReady, (client) => {
			const commands = CommandRegistry.constructors.map((c) =>
				CommandRegistry.buildSlashCommand(c),
			);

			void client.application.commands.set(commands);
		});
	}

	public override on<K extends keyof BakitClientEvents>(
		event: K,
		listener: (...args: BakitClientEvents[K]) => void,
	): this {
		return super.on(event as never, listener);
	}

	public override once<K extends keyof BakitClientEvents>(
		event: K,
		listener: (...args: BakitClientEvents[K]) => void,
	): this {
		return super.once(event as never, listener);
	}

	public override off<K extends keyof BakitClientEvents>(
		event: K,
		listener: (...args: BakitClientEvents[K]) => void,
	): this {
		return super.off(event as never, listener);
	}

	public override removeAllListeners(event?: keyof BakitClientEvents): this {
		return super.removeAllListeners(event as never);
	}

	public override removeListener<K extends keyof BakitClientEvents>(
		event: K,
		listener: (...args: BakitClientEvents[K]) => void,
	): this {
		return super.removeListener(event as never, listener);
	}

	public override emit<K extends keyof BakitClientEvents>(
		event: K,
		...args: BakitClientEvents[K]
	): boolean {
		return super.emit(event as never, ...args);
	}
}
