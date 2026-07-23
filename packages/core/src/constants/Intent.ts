import { GatewayIntentBits } from "discord-api-types/v10";
import type { ValueOf } from "type-fest";
import type { EnumValue } from "../types";

type IntentObject = {
	readonly [K in keyof typeof GatewayIntentBits]: EnumValue<(typeof GatewayIntentBits)[K]>;
};

export const Intent = Object.fromEntries(
	Object.entries(GatewayIntentBits).filter(([, value]) => typeof value === "number"),
) as IntentObject;

export type Intent = ValueOf<typeof Intent>;
