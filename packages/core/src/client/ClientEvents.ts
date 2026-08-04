import type {
	GatewayDispatchPayload,
	GatewayGuildCreateDispatchData,
	GatewayGuildDeleteDispatchData,
	GatewayInteractionCreateDispatchData,
	GatewayMessageCreateDispatchData,
	GatewayMessageDeleteDispatchData,
	GatewayMessageReactionAddDispatchData,
	GatewayMessageReactionRemoveAllDispatchData,
	GatewayMessageReactionRemoveDispatchData,
	GatewayMessageReactionRemoveEmojiDispatchData,
	GatewayMessageUpdateDispatchData,
	GatewayReadyDispatchData,
} from "discord-api-types/v10";

import type { ClientEvent } from "#/constants";
import type {
	GuildRef,
	GuildSnapshot,
	InteractionSnapshot,
	MessageReactionSnapshot,
	MessageRef,
	MessageSnapshot,
	UserRef,
} from "#/models";

import type { Client } from "./Client";

export interface ClientEvents {
	[ClientEvent.Ready]: [event: ClientReadyEvent];

	[ClientEvent.MessageCreate]: [event: ClientMessageCreateEvent];
	[ClientEvent.MessageUpdate]: [event: ClientMessageUpdateEvent];
	[ClientEvent.MessageDelete]: [event: ClientMessageDeleteEvent];

	[ClientEvent.MessageReactionAdd]: [event: ClientMessageReactionAddEvent];
	[ClientEvent.MessageReactionRemove]: [event: ClientMessageReactionRemoveEvent];
	[ClientEvent.MessageReactionRemoveAll]: [event: ClientMessageReactionRemoveAllEvent];
	[ClientEvent.MessageReactionRemoveEmoji]: [event: ClientMessageReactionRemoveEmojiEvent];

	[ClientEvent.InteractionCreate]: [event: ClientInteractionCreateEvent];

	[ClientEvent.GuildCreate]: [event: ClientGuildCreateEvent];
	[ClientEvent.GuildDelete]: [event: ClientGuildDeleteEvent];
	[ClientEvent.GuildAvailable]: [event: ClientGuildAvailableEvent];
	[ClientEvent.GuildUnavailable]: [event: ClientGuildUnavailableEvent];

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
	previous?: MessageSnapshot;
}

export interface ClientMessageReactionAddEvent
	extends ClientEventBase<GatewayMessageReactionAddDispatchData> {
	message: MessageRef;
	user: UserRef;
	reaction: MessageReactionSnapshot;
}

export interface ClientMessageReactionRemoveEvent
	extends ClientEventBase<GatewayMessageReactionRemoveDispatchData> {
	message: MessageRef;
	user: UserRef;
	reaction: MessageReactionSnapshot;
}

export interface ClientMessageReactionRemoveEmojiEvent
	extends ClientEventBase<GatewayMessageReactionRemoveEmojiDispatchData> {
	message: MessageRef;
	reaction: MessageReactionSnapshot;
}

export interface ClientMessageReactionRemoveAllEvent
	extends ClientEventBase<GatewayMessageReactionRemoveAllDispatchData> {
	message: MessageRef;
}

export interface ClientInteractionCreateEvent
	extends ClientEventBase<GatewayInteractionCreateDispatchData> {
	interaction: InteractionSnapshot;
}

export interface ClientGuildCreateEvent extends ClientEventBase<GatewayGuildCreateDispatchData> {
	guild: GuildRef;
}

export interface ClientGuildDeleteEvent extends ClientEventBase<GatewayGuildDeleteDispatchData> {
	guild: GuildRef;
	previous?: GuildSnapshot;
}

export interface ClientGuildAvailableEvent extends ClientGuildCreateEvent {}
export interface ClientGuildUnavailableEvent extends ClientGuildDeleteEvent {}
