import { z } from "zod";

import { Context } from "./Context.js";

import { BaseEntry } from "../base/BaseEntry.js";
import { AnyParam, BaseParam, InferParamTuple } from "./param/Param.js";
import { Params } from "./param/Params.js";

export const CommandOptionsSchema = z
	.object({
		name: z.string(),
		description: z.string().optional(),
		params: z.array(z.instanceof(BaseParam)).default([]),
	})
	.transform((data) => ({
		...data,
		description: data.description ?? `Command ${data.name}`,
	}));

export type CommandOptionsInput = z.input<typeof CommandOptionsSchema>;
export type CommandOptions = z.output<typeof CommandOptionsSchema>;

/**
 * The command entry, used for registering command.
 */
export class Command<ParamsList extends ReadonlyArray<AnyParam> = []> extends BaseEntry<
	[context: Context, ...params: InferParamTuple<ParamsList>]
> {
	declare public options: CommandOptions;

	public constructor(
		options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string,
	) {
		super({});

		this.options = CommandOptionsSchema.parse(
			typeof options === "string" ? { name: options } : options,
		);
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
export function defineCommand<const ParamsList extends ReadonlyArray<AnyParam> = []>(
	options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string,
) {
	return new Command<ParamsList>(options);
}

const p = defineCommand({
	name: "hello",
	params: [Params.string("name"), Params.number("age")],
});

p.setMain(async (ctx, name, age) => {
	await ctx.send(`hello ${name}, age: ${age}`);
});
