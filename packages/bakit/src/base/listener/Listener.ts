import { Events } from "discord.js";
import { Context } from "../lifecycle/Context.js";
import { LifecycleManager } from "../lifecycle/LifecycleManager.js";
import z from "zod";
import type { BakitClientEvents } from "../client/BakitClient.js";

export const ListenerOptionsSchema = z.object({
	name: z.enum(Events),
	once: z.boolean().default(false),
});

export type ListenerOptions<K extends EventKey = EventKey> = Omit<z.input<typeof ListenerOptionsSchema>, "name"> & {
	name: K;
};

type EventKey = keyof BakitClientEvents;

export class Listener<K extends EventKey = EventKey> extends LifecycleManager<
	Context,
	[...args: BakitClientEvents[K]]
> {
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
