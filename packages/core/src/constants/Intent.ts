import { GatewayIntentBits } from "discord-api-types/v10";
import type { ValueOf } from "type-fest";

import { createNumericEnumObject } from "#/utils";

export const Intent = { ...createNumericEnumObject(GatewayIntentBits) } as const;
export type Intent = ValueOf<typeof Intent>;
