export type Serializable =
	| string
	| number
	| boolean
	| null
	| undefined
	| Serializable[]
	| { [key: string]: Serializable };

export interface RPCRequest {
	type: "request";
	id: string;
	method: string;
	args: Serializable[];
}

export interface RPCResponse {
	type: "response";
	id: string;
	result?: Serializable;
	error?: { message: string; stack?: string; code?: string };
}
