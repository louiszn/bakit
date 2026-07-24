import { MessageFlags } from "discord-api-types/v10";
import type { ValueOf } from "type-fest";

import { createNumericEnumObject } from "#/utils";

export const MessageFlag = { ...createNumericEnumObject(MessageFlags) } as const;
export type MessageFlag = ValueOf<typeof MessageFlag>;
