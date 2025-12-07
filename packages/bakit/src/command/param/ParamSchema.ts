import { z } from "zod";

export enum ParamUserType {
	Bot = "bot",
	Normal = "normal",
	Any = "any",
}

export const BaseParamSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	required: z.boolean().default(true),
});

const withDefaultDescription = <T extends BaseParamOptions>(data: T) => ({
	...data,
	description: data.description ?? `${data.name}`,
});

export const StringParamSchema = BaseParamSchema.extend({
	maxLength: z.number().min(1).optional(),
	minLength: z.number().min(1).optional(),
}).transform(withDefaultDescription);

export const NumberParamSchema = BaseParamSchema.extend({
	maxValue: z.number().optional(),
	minValue: z.number().optional(),
}).transform(withDefaultDescription);

export type BaseParamOptions = z.input<typeof BaseParamSchema>;
export type StringOptions = z.input<typeof StringParamSchema>;
export type NumberOptions = z.input<typeof NumberParamSchema>;
