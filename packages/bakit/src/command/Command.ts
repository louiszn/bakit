import { z } from "zod";

import { type CommandContext } from "./CommandContext.js";

import { HookState, LifecycleManager } from "../base/lifecycle/LifecycleManager.js";
import { type AnyParam, BaseParam, type InferParamTuple } from "./param/Param.js";
import { BakitError } from "../errors/BakitError.js";

export const CommandOptionsSchema = z
	.object({
		name: z.string(),
		description: z.string().min(1).max(100).optional(),
		params: z.array(z.instanceof(BaseParam)).default([]),
		quotes: z.boolean().default(true),
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
export class Command<ParamsList extends readonly AnyParam<any>[] = any[]> extends LifecycleManager<
	CommandContext,
	[...args: InferParamTuple<ParamsList>]
> {
	declare public options: CommandOptions;

	public constructor(options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string) {
		const _options = CommandOptionsSchema.parse(typeof options === "string" ? { name: options } : options);

		super(`command:${_options.name}`);
		this.options = _options;

		this.setHook("syntaxError", HookState.Error, async (ctx, error, ...args) => {
			await this.handleSyntaxError(ctx, error, args);
		});
	}

	private async handleSyntaxError(context: CommandContext, error: unknown, _args: unknown[]) {
		if (!(error instanceof BakitError)) {
			return;
		}

		await context.send(error.message);
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
export function defineCommand<const ParamsList extends readonly AnyParam<any>[] = any[]>(
	options: (Omit<CommandOptionsInput, "params"> & { params?: ParamsList }) | string,
) {
	return new Command<ParamsList>(options);
}
