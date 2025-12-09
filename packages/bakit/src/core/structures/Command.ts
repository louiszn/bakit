import type { ApplicationCommandOptionBase } from "discord.js";
import {
	SlashCommandBuilder,
	SlashCommandNumberOption,
	SlashCommandStringOption,
	SlashCommandUserOption,
} from "discord.js";
import z from "zod";

import { type AnyParam, BaseParam, type InferParamTuple, NumberParam, StringParam, UserParam } from "./param/Param.js";

import { BakitError } from "../../lib/errors/BakitError.js";
import { HookState, LifecycleManager } from "../managers/LifecycleManager.js";

import type { CommandContext } from "../context/CommandContext.js";
import type { BaseParamSchema } from "./param/ParamSchema.js";

export function validateParamsOrder(params: readonly AnyParam<boolean>[]): boolean {
	let seenOptional = false;

	for (const param of params) {
		if (param.options.required) {
			if (seenOptional) {
				return false;
			}
		} else {
			seenOptional = true;
		}
	}

	return true;
}

export const CommandOptionsSchema = z
	.object({
		name: z.string().readonly(),
		description: z.string().min(1).max(100).optional().readonly(),
		nsfw: z.boolean().default(false).readonly(),
		params: z.array(z.instanceof(BaseParam)).default([]).readonly(),
		quotes: z.boolean().default(true).readonly(),
	})
	.transform((data) => ({
		...data,
		description: data.description ?? `Command ${data.name}`,
	}))
	.refine(({ params }) => validateParamsOrder(params), {
		path: ["params"],
		error: "Required params must be placed before optional params",
	});

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

	public toSlashCommandJSON() {
		const { name, description, nsfw, params } = this.options;

		const builder = new SlashCommandBuilder().setName(name).setDescription(description).setNSFW(nsfw);

		this.initSlashCommandOptions(builder, params);

		return builder.toJSON();
	}

	private initSlashCommandOptions(builder: SlashCommandBuilder, params: readonly AnyParam<boolean>[]) {
		for (const param of params) {
			this.initSlashCommandOption(builder, param);
		}
	}

	private initSlashCommandOption(builder: SlashCommandBuilder, param: AnyParam<boolean>) {
		const initOption = <T extends ApplicationCommandOptionBase>(builder: T) => {
			const { name, description, required } = param.options as z.output<typeof BaseParamSchema>;

			return builder
				.setName(name)
				.setDescription(description as never)
				.setRequired(required);
		};

		if (param instanceof StringParam) {
			const { maxLength, minLength } = param.options;
			const option = initOption(new SlashCommandStringOption());

			if (maxLength) {
				option.setMaxLength(maxLength);
			}
			if (minLength) {
				option.setMinLength(minLength);
			}

			builder.addStringOption(option);
			return;
		}
		if (param instanceof NumberParam) {
			const { maxValue, minValue } = param.options;
			const option = initOption(new SlashCommandNumberOption());

			if (maxValue) {
				option.setMaxValue(maxValue);
			}
			if (minValue) {
				option.setMinValue(minValue);
			}

			builder.addNumberOption(option);
			return;
		}
		if (param instanceof UserParam) {
			const option = initOption(new SlashCommandUserOption());
			builder.addUserOption(option);
			return;
		}
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
