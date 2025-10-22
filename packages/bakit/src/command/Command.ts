import { Awaitable } from "discord.js";
import { z } from "zod";

import { Context } from "./Context.js";
import {
	BaseArgumentBuilder,
	type AnyArgumentBuilder,
	type InferArgsTuple,
} from "./argument/index.js";

export const CommandOptionsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		args: z.array(z.instanceof(BaseArgumentBuilder)).default([]),
	})
	.transform((data) => ({
		...data,
		description: data.description ?? `Command ${data.name}`,
	}));

export type CommandOptionsInput = z.input<typeof CommandOptionsSchema>;
export type CommandOptions = z.output<typeof CommandOptionsSchema>;

export type MainCommandHookMethod<Args extends unknown[]> = (
	context: Context,
	...args: Args
) => Awaitable<void>;

export type ErrorCommandHookMethod<Args extends unknown[]> = (
	error: unknown,
	context: Context,
	...args: Args
) => Awaitable<void>;

/**
 * The command entry, used for registering command.
 */
export class Command<Args extends AnyArgumentBuilder[]> {
	public readonly options: CommandOptions;

	public readonly hooks: {
		main?: MainCommandHookMethod<InferArgsTuple<Args>>;
		pre?: MainCommandHookMethod<InferArgsTuple<Args>>;
		post?: MainCommandHookMethod<InferArgsTuple<Args>>;
		error?: ErrorCommandHookMethod<InferArgsTuple<Args>>;
	} = {};

	public constructor(options: CommandOptionsInput | CommandOptionsInput["name"]) {
		this.options = CommandOptionsSchema.parse(
			typeof options === "string" ? { name: options } : options,
		);
	}

	public setMain(fn: MainCommandHookMethod<InferArgsTuple<Args>>): this {
		this.hooks.main = fn;
		return this;
	}

	public setPre(fn: MainCommandHookMethod<InferArgsTuple<Args>>): this {
		this.hooks.pre = fn;
		return this;
	}

	public setPost(fn: MainCommandHookMethod<InferArgsTuple<Args>>): this {
		this.hooks.post = fn;
		return this;
	}

	public setError(fn: ErrorCommandHookMethod<InferArgsTuple<Args>>): this {
		this.hooks.error = fn;
		return this;
	}
}

/**
 * Define command entry, usually for modules.
 * @param options The command options.
 * @returns The entry of the command to deploy or register hooks.
 * @example
 * ```ts
 * import { defineCommand } from "bakit";
 *
 * const PingCommand = defineCommand({
 * 	name: "ping",
 * 	description: "Displays bot's latency.",
 * });
 *
 * PingCommand.setMain(async (context) => {
 * 	await context.send(`Pong! ${context.client.ws.ping}ms!`);
 * });
 *
 * export default PingCommand;
 * ```
 */
export function defineCommand<const Args extends AnyArgumentBuilder[]>(
	options: (Omit<CommandOptionsInput, "args"> & { args?: Args }) | string,
) {
	return new Command<Args>(options);
}
