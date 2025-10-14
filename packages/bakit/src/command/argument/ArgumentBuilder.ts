import { z } from "zod";

export const BaseArgumentOptionsSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	required: z.boolean().default(true),
});

export const StringArgumentOptionsSchema = BaseArgumentOptionsSchema.extend({
	maxLength: z.number().min(1).optional(),
	minLength: z.number().min(1).optional(),
});

export const NumberArgumentOptionsSchema = BaseArgumentOptionsSchema.extend({
	maxValue: z.number().optional(),
	minValue: z.number().optional(),
});

export abstract class BaseArgumentBuilder<
	Schema extends typeof BaseArgumentOptionsSchema,
	Input extends z.input<Schema> = z.input<Schema>,
> {
	public constructor(
		public options: Input,
		public schema: Schema,
	) {}

	public defineOption<K extends keyof Input>(key: K, value: Input[K] | null) {
		if (value === null) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			delete this.options[key];
		} else {
			this.options[key] = value;
		}

		return this;
	}

	public setName(value: string) {
		return this.defineOption("name", value);
	}

	public setDescription(value: string | null) {
		return this.defineOption("description", value);
	}

	public setRequired(value: boolean) {
		return this.defineOption("required", value);
	}

	public build(): z.output<Schema> {
		return this.schema.parse(this.options);
	}

	public static extend<Schema extends typeof BaseArgumentOptionsSchema>(schema: Schema) {
		return class ExtendedArgumentBuilder extends BaseArgumentBuilder<Schema> {
			constructor(options: z.input<Schema>) {
				super(options, schema);
			}
		};
	}
}

export class StringArgumentBuilder extends BaseArgumentBuilder.extend(StringArgumentOptionsSchema) {
	public setMaxLength(length: number | null) {
		return this.defineOption("maxLength", length);
	}

	public setMinLength(length: number | null) {
		return this.defineOption("minLength", length);
	}
}

export class NumberArgumentBuilder extends BaseArgumentBuilder.extend(NumberArgumentOptionsSchema) {
	public setMaxValue(value: number | null) {
		return this.defineOption("maxValue", value);
	}

	public setMinValue(value: number | null) {
		return this.defineOption("minValue", value);
	}
}
