import { Awaitable } from "discord.js";
import { z } from "zod";
import { Context } from "./Context.js";
import { BaseArgumentBuilder } from "./argument/ArgumentBuilder.js";

const CommandOptionsSchema = z
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

export type MainCommandHookMethod = (context: Context) => Awaitable<void>;
export type ErrorCommandHookMethod = (error: unknown, context: Context) => Awaitable<void>;

export class Command {
	public readonly options: CommandOptions;

	public readonly hooks: {
		main?: MainCommandHookMethod;
		pre?: MainCommandHookMethod;
		post?: MainCommandHookMethod;
		error?: ErrorCommandHookMethod;
	} = {};

	public constructor(options: CommandOptionsInput | CommandOptionsInput["name"]) {
		this.options = CommandOptionsSchema.parse(
			typeof options === "string" ? { name: options } : options,
		);
	}

	public setMain(fn: MainCommandHookMethod): this {
		this.hooks.main = fn;
		return this;
	}

	public setPre(fn: MainCommandHookMethod): this {
		this.hooks.pre = fn;
		return this;
	}

	public setPost(fn: MainCommandHookMethod): this {
		this.hooks.post = fn;
		return this;
	}

	public setError(fn: ErrorCommandHookMethod): this {
		this.hooks.error = fn;
		return this;
	}
}

export function defineCommand(options: CommandOptionsInput | string) {
	return new Command(options);
}
