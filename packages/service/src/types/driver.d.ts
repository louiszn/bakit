import type { EventEmitter } from "@bakit/utils";

export type Serializable = string | number | bigint | boolean | object;

export interface Driver extends EventEmitter {
	send: (message: Serializable) => void;
	start: () => void;
}
