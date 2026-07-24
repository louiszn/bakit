import type {
	GatewayDispatchPayload,
	GatewayInteractionCreateDispatchData,
	GatewayMessageCreateDispatchData,
	GatewayMessageDeleteDispatchData,
	GatewayMessageUpdateDispatchData,
	GatewayReadyDispatchData,
} from "discord-api-types/v10";

import type { ClientEvent } from "#/constants";
import type { InteractionSnapshot, MessageRef, MessageSnapshot, UserRef } from "#/models";

import type { Client } from "./Client";

export interface ClientEvents {
	[ClientEvent.Ready]: [event: ClientReadyEvent];

	[ClientEvent.MessageCreate]: [event: ClientMessageCreateEvent];
	[ClientEvent.MessageUpdate]: [event: ClientMessageUpdateEvent];
	[ClientEvent.MessageDelete]: [event: ClientMessageDeleteEvent];

	[ClientEvent.InteractionCreate]: [event: ClientInteractionCreateEvent];

	/**
	 * Raw dispatches for unhandled events.
	 * This should not be used unless you are trying to work with unstable features.
	 */
	[ClientEvent.Raw]: [payload: GatewayDispatchPayload];
}

export interface ClientEventBase<TRaw> {
	readonly raw: TRaw;
	readonly client: Client;
}

export interface ClientReadyEvent extends ClientEventBase<GatewayReadyDispatchData> {
	readonly user: UserRef;
}

export interface ClientMessageCreateEvent
	extends ClientEventBase<GatewayMessageCreateDispatchData> {
	readonly message: MessageRef;
	readonly author: UserRef;
}

export interface ClientMessageUpdateEvent
	extends ClientEventBase<GatewayMessageUpdateDispatchData> {
	message: MessageRef;
	author: UserRef;
	previous?: MessageSnapshot;
}

export interface ClientMessageDeleteEvent
	extends ClientEventBase<GatewayMessageDeleteDispatchData> {
	message: MessageRef;
	deleted?: MessageSnapshot;
}

export interface ClientInteractionCreateEvent
	extends ClientEventBase<GatewayInteractionCreateDispatchData> {
	interaction: InteractionSnapshot;
}
