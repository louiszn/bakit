import type { Message } from "discord.js";
import { type Awaitable, Client, type ClientEvents, type ClientOptions } from "discord.js";
import { inspect } from "node:util";

import { CommandManager } from "../managers/CommandManager.js";
import { ListenerManager } from "../managers/ListenerManager.js";

import type { Instance } from "../internal/Instance.js";

export type GetPrefixFunction = (message: Message) => Awaitable<string[] | string>;

export interface BakitClientEvents extends ClientEvents {
	ready: [BakitClient<true>];
	clientReady: [BakitClient<true>];
}

export class BakitClient<Ready extends boolean = boolean> extends Client<Ready> {
	public managers: {
		commands: CommandManager;
		listeners: ListenerManager;
	};

	public constructor(
		options: ClientOptions,
		public instance: Instance,
	) {
		super(options);

		this.managers = {
			commands: new CommandManager(this),
			listeners: new ListenerManager(this),
		};
	}

	/**
	 * Check if the client is connected to gateway successfully and finished initialization.
	 */
	public override isReady(): this is BakitClient<true> {
		return super.isReady();
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

	public override emit<K extends keyof BakitClientEvents>(event: K, ...args: BakitClientEvents[K]): boolean {
		return super.emit(event as never, ...args);
	}

	/**
	 * Override BakitClient output when using logger for security concern.
	 * @returns `BakitClient {}`
	 */
	[inspect.custom]() {
		return `${this.constructor.name} {}`;
	}
}
