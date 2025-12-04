import { type ClientEvents, Events } from "discord.js";
import { Context } from "../base/lifecycle/Context.js";
import { LifecycleManager } from "../base/lifecycle/LifecycleManager.js";
import z from "zod";

export const ListenerOptionsSchema = z.object({
	name: z.enum(Events),
	once: z.boolean().default(false),
});

export type ListenerOptions<K extends EventKey = EventKey> = Omit<z.input<typeof ListenerOptionsSchema>, "name"> & {
	name: K;
};

type EventKey = keyof ClientEvents;

export class Listener<K extends EventKey = EventKey> extends LifecycleManager<Context, [...args: ClientEvents[K]]> {
	public options: ListenerOptions<K>;

	public constructor(options: K | ListenerOptions<K>) {
		const _options = ListenerOptionsSchema.parse(typeof options === "string" ? { name: options } : options);

		super(`listener:${_options.name}`);

		this.options = _options as never;
	}
}

export function defineListener<const K extends EventKey = EventKey>(options: K | ListenerOptions<K>) {
	return new Listener(options);
}
