import { MessageFlags } from "discord-api-types/v10";
import type { ValueOf } from "type-fest";
import type { EnumValue } from "../types";

type MessageFlagObject = {
	readonly [K in keyof typeof MessageFlags]: EnumValue<(typeof MessageFlags)[K]>;
};

export const MessageFlag = Object.fromEntries(
	Object.entries(MessageFlags).filter(([, value]) => typeof value === "number"),
) as MessageFlagObject;

export type MessageFlag = ValueOf<typeof MessageFlag>;
