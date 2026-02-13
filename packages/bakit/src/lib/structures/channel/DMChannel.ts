import { applyMixins } from "tiny-mixin";
import { BaseChannel } from "./BaseChannel.js";
import { TextBasedChannelMixin } from "@/lib/mixins/ChannelMixin.js";

import type { APIDMChannel } from "discord-api-types/v10";

export class DMChannel extends applyMixins(BaseChannel<APIDMChannel>, [TextBasedChannelMixin]) {}
