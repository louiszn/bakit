import type { Serializable } from "@/types/driver.js";

export interface RPCErrorPayload {
	message: string;
	code?: number | string;
	data?: Serializable;
}

export class RPCError extends Error implements RPCErrorPayload {
	public readonly code?: number | string;
	public readonly data?: Serializable;

	public constructor(message: string, options: Omit<RPCErrorPayload, "message"> = {}) {
		super(message);

		this.name = "RPCError";
		this.code = options.code;
		this.data = options.data;
	}
}

export function serializeRPCError(error: unknown): RPCErrorPayload {
	if (error instanceof RPCError) {
		return {
			message: error.message,
			code: error.code,
			data: error.data,
		};
	}

	if (error instanceof Error) {
		return {
			message: error.message,
			code: error.name,
		};
	}

	return {
		message: String(error),
	};
}

export function deserializeRPCError(payload: RPCErrorPayload): RPCError {
	return new RPCError(payload.message, {
		code: payload.code,
		data: payload.data,
	});
}
