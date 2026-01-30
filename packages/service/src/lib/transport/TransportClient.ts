// import EventEmitter from "node:events";

// import type { BaseClientDriver } from "../drivers/BaseDriver.js";
// import type { RPCRequest, RPCResponse, Serializable } from "@/types/message.js";
// import { isPlainObject } from "@bakit/utils";

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export type AnyClientDriver = BaseClientDriver<any, any>;

// export class TransportClient<D extends AnyClientDriver> extends EventEmitter {
// 	public constructor(public readonly driver: D) {
// 		super();
// 		// this.setupDriverListeners();
// 	}

// }

// export function createTransportClient<D extends AnyClientDriver>(driver: D) {
// 	return new TransportClient(driver);
// }
