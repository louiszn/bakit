import type { GatewayDispatchPayload, GatewayReadyDispatchData } from "discord-api-types/v10";
import type { ValueOf } from "type-fest";
import type { UserRef } from "../refs";

export const ClientEvent = {
	Raw: "raw",
	Ready: "ready",
} as const;
export type ClientEvent = ValueOf<typeof ClientEvent>;

export interface ClientEvents {
	[ClientEvent.Ready]: [event: ClientReadyEvent];

	/**
	 * Raw dispatches for unhandled events.
	 * This should not be used unless you are trying to work with unstable features.
	 */
	[ClientEvent.Raw]: [payload: GatewayDispatchPayload];
}

export interface ClientReadyEvent {
	raw: GatewayReadyDispatchData;
	user: UserRef;
}
