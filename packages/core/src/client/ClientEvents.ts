import type {
	GatewayDispatchPayload,
	GatewayMessageCreateDispatchData,
	GatewayMessageDeleteDispatchData,
	GatewayMessageUpdateDispatchData,
	GatewayReadyDispatchData,
} from "discord-api-types/v10";
import type { ValueOf } from "type-fest";
import type { MessageRef, UserRef } from "../refs";
import type { MessageSnapshot } from "../snapshots";
import type { Client } from "./Client";

export const ClientEvent = {
	Raw: "raw",
	Ready: "ready",
	MessageCreate: "messageCreate",
	MessageUpdate: "messageUpdate",
	MessageDelete: "messageDelete",
} as const;
export type ClientEvent = ValueOf<typeof ClientEvent>;

export interface ClientEvents {
	[ClientEvent.Ready]: [event: ClientReadyEvent];

	[ClientEvent.MessageCreate]: [event: ClientMessageCreateEvent];
	[ClientEvent.MessageUpdate]: [event: ClientMessageUpdateEvent];
	[ClientEvent.MessageDelete]: [event: ClientMessageDeleteEvent];

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
