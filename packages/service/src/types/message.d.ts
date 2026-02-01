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
	error?: RPCResponseError;
}

export interface RPCResponseError {
	message: string;
	name: string;
	constructorName: string;
	stack?: string;
	cause?: RPCResponseError;
	errors?: RPCResponseError[]; // For AggregateError
	[key: string]: unknown;
}
