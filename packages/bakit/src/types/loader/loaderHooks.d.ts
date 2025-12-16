export interface InitializeData {
	port: MessagePort;
}

export interface ResolveContext {
	conditions: string[];
	importAttributes: Record<string, string>;
	parentURL?: string;
}

export interface ResolveResult {
	url: string;
	shortCircuit?: boolean;
	format?: string | null | undefined;
	importAttributes?: Record<string, string>;
}

export interface LoadContext {
	conditions: string[];
	format: string | null | undefined;
	importAttributes: Record<string, string>;
}

export interface LoadResult {
	source: string | ArrayBuffer | Uint8Array;
	format: string;
	shortCircuit?: boolean;
}

export type NextResolve = (specifier: string, context: ResolveContext) => Promise<ResolveResult>;
export type NextLoad = (url: string, context: LoadContext) => Promise<LoadResult>;
