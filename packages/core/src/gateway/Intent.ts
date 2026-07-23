import { GatewayIntentBits } from "discord-api-types/v10";

type EnumValue<T extends number> = `${T}` extends `${infer N extends number}` ? N : never;

export type Intent = {
	readonly [K in keyof typeof GatewayIntentBits]: EnumValue<(typeof GatewayIntentBits)[K]>;
};

export const Intent = Object.fromEntries(
	Object.entries(GatewayIntentBits).filter(([, value]) => typeof value === "number"),
) as Intent;
