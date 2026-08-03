import { extractSnowflake, type UserRef, UserSnapshot } from "bakit";

import { ParameterParseError } from "#/errors";

import { Parameter, type ParameterOptions, type ParameterParseContext } from "./Parameter";

export interface UserParameterOptions<Required extends boolean = boolean>
	extends ParameterOptions<Required> {}

export class UserParameter<Required extends boolean = false> extends Parameter<UserRef, Required> {
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly pattern?: RegExp;

	// biome-ignore lint/complexity/noUselessConstructor: Ignore for now
	constructor(options?: UserParameterOptions<Required>) {
		super(options);
	}

	async parse(value: string | UserSnapshot, context: ParameterParseContext): Promise<UserRef> {
		const { users } = context.context.client.resources;

		let snapshot: UserSnapshot;

		if (value instanceof UserSnapshot) {
			snapshot = value;
		} else {
			const id = extractSnowflake(value);

			if (!id) {
				throw new ParameterParseError(this, `Invalid user: ${value}`, context);
			}

			try {
				snapshot = await users.resolve(id);
			} catch {
				throw new ParameterParseError(this, `User not found: ${id}`, context);
			}
		}

		return users.ref(snapshot.id, snapshot);
	}
}
