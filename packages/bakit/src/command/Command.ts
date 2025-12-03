import { z } from "zod";

import { CommandContext } from "./CommandContext.js";

import { LifecycleManager } from "../base/lifecycle/LifecycleManager.js";
import { AnyParam, BaseParam, InferParamTuple } from "./param/Param.js";

export const CommandOptionsSchema = z
	.object({
		name: z.string(),
		description: z.string().min(1).max(100).optional(),
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Command<ParamsList extends readonly AnyParam<any>[] = []> extends LifecycleManager<
	CommandContext,
	[...args: InferParamTuple<ParamsList>]
> {
	declare public options: CommandOptions;

	public constructor(options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string) {
		const _options = CommandOptionsSchema.parse(typeof options === "string" ? { name: options } : options);

		super(`command:${_options.name}`);
		this.options = _options;
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
 * const command = defineCommand({
 * 	name: "ping",
 * 	description: "Displays bot's latency.",
 * });
 *
 * command.main(async (context) => {
 * 	await context.send(`Pong! ${context.client.ws.ping}ms!`);
 * });
 *
 * export default command;
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function defineCommand<const ParamsList extends readonly AnyParam<any>[] = []>(
	options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string,
) {
	return new Command<ParamsList>(options);
}
