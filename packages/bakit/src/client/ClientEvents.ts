import type { GatewayDispatchPayload, GatewayReadyDispatchData } from "discord-api-types/v10";

import type { UserRef } from "../refs";

export interface ClientEvents {
	ready: [event: ClientReadyEvent];

	/**
	 * Raw dispatches for unhandled events.
	 * This should not be used unless you are trying to work with unstable features.
	 * @
	 */
	raw: [payload: GatewayDispatchPayload]
}

export interface ClientReadyEvent {
	raw: GatewayReadyDispatchData;
	user: UserRef;
}
