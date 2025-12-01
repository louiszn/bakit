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

export const StringParamSchema = BaseParamSchema.extend({
	maxLength: z.number().min(1).optional(),
	minLength: z.number().min(1).optional(),
});

export const NumberParamSchema = BaseParamSchema.extend({
	maxValue: z.number().optional(),
	minValue: z.number().optional(),
});

export type StringOptions = z.input<typeof StringParamSchema>;
export type NumberOptions = z.input<typeof NumberParamSchema>;
