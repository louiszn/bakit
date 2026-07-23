import {
	type APIInteractionResponseChannelMessageWithSource,
	type APIMessage,
	InteractionResponseType,
	type RESTPostAPIInteractionCallbackWithResponseResult,
	Routes,
} from "discord-api-types/v10";
import { type Constructor, createMixin } from "tiny-mixin";

import type { MessageRef } from "../../../refs";
import type { MessageCreateOptions } from "../../../types";
import { resolveFlags } from "../../../utils";
import { SnapshotSource } from "../../Snapshot";
import type { BaseInteractionSnapshot } from "../InteractionSnapshot";

export interface InteractionReplyOptions extends Omit<MessageCreateOptions, "reply"> {
	withMessage?: boolean;
}

export type InteractionFollowUpOptions = Omit<InteractionReplyOptions, "withMessage">;

export interface InteractionDeferReplyOptions {
	flags?: number;
}

export const RepliableInteractionMixin = createMixin(
	(base: Constructor<BaseInteractionSnapshot>) => {
		abstract class RepliableInteraction extends base {
			reply(
				options: InteractionReplyOptions & {
					withMessage: true;
				},
			): Promise<MessageRef>;
			reply(
				options:
					| string
					| (InteractionReplyOptions & {
							withMessage?: false;
					  }),
			): Promise<undefined>;
			reply(options: InteractionReplyOptions): Promise<MessageRef | undefined>;
			async reply(options: InteractionReplyOptions | string): Promise<MessageRef | undefined> {
				const normalized = typeof options === "string" ? { content: options } : options;
				const { withMessage = false, ...data } = normalized;

				const body: APIInteractionResponseChannelMessageWithSource = {
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: resolveFlags(data.flags),
					},
				};

				const response = await this.resources.rest.post(
					Routes.interactionCallback(this.id, this.token),
					{
						auth: false,
						query: withMessage
							? new URLSearchParams({
									with_response: "true",
								})
							: undefined,
						body,
					},
				);

				if (!withMessage) {
					return;
				}

				const raw = (response as RESTPostAPIInteractionCallbackWithResponseResult).resource
					?.message;

				if (!raw) {
					throw new Error("Interaction response did not include a message");
				}

				return this.#createMessageRef(raw);
			}

			async deferReply(options: InteractionDeferReplyOptions = {}): Promise<void> {
				await this.resources.rest.post(Routes.interactionCallback(this.id, this.token), {
					auth: false,
					body: {
						type: InteractionResponseType.DeferredChannelMessageWithSource,
						data: { flags: resolveFlags(options.flags) },
					},
				});
			}

			async followUp(options: InteractionFollowUpOptions | string): Promise<MessageRef> {
				const body = typeof options === "string" ? { content: options } : options;

				const raw = (await this.resources.rest.post(
					Routes.webhook(this.applicationId, this.token),
					{
						auth: false,
						body,
					},
				)) as APIMessage;

				return this.#createMessageRef(raw);
			}

			#createMessageRef(raw: APIMessage): MessageRef {
				const snapshot = this.resources.messages.createSnapshot(raw.id, raw, SnapshotSource.Rest);
				return this.resources.messages.ref(raw.id, raw.channel_id, snapshot);
			}
		}

		return RepliableInteraction;
	},
);
