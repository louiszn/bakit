import { createRESTBucketManager } from "./bucket.js";

import type { OptionalKeysOf, ValueOf } from "type-fest";

export interface REST {
	request<T = unknown>(endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown): Promise<T>;
	get<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	head<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	delete<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	post<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
	put<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
	patch<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
}

export interface RESTOptions {
	/**
	 * The version of Discord API.
	 * @defaultValue 10
	 */
	version?: number;
	baseURL?: string;
	token: string;
}

export type RESTEndpoint = `/${string}`;

export const RESTMethod = {
	Get: "GET",
	Put: "PUT",
	Post: "POST",
	Patch: "PATCH",
	Head: "HEAD",
	Delete: "DELETE",
} as const;
export type RESTMethod = ValueOf<typeof RESTMethod>;

export const DEFAULT_REST_OPTIONS = {
	version: 10,
	baseURL: "https://discord.com/api/",
} as const satisfies Pick<RESTOptions, OptionalKeysOf<RESTOptions>>;

export function createREST(options: RESTOptions): REST {
	const resolvedOptions = { ...DEFAULT_REST_OPTIONS, ...options };
	const baseURL = new URL(`v${resolvedOptions.version}`, resolvedOptions.baseURL).toString();

	const buckets = createRESTBucketManager();

	function request<T = unknown>(endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown): Promise<T> {
		const route = getRoute(endpoint, method);
		const bucket = buckets.use(route);

		const url = new URL(endpoint, baseURL).toString();

		return bucket.request(route, url, {
			method,
			headers: {
				Authorization: `Bot ${resolvedOptions.token}`,
				"Content-Type": "application/json",
			},
			body: payload !== undefined ? JSON.stringify(payload) : "{}",
		});
	}

	return {
		request,
		get(endpoint: RESTEndpoint) {
			return request(endpoint, RESTMethod.Get);
		},
		head(endpoint: RESTEndpoint) {
			return request(endpoint, RESTMethod.Head);
		},
		delete(endpoint: RESTEndpoint) {
			return request(endpoint, RESTMethod.Delete);
		},
		post(endpoint: RESTEndpoint, payload?: unknown) {
			return request(endpoint, RESTMethod.Post, payload);
		},
		put(endpoint: RESTEndpoint, payload?: unknown) {
			return request(endpoint, RESTMethod.Put, payload);
		},
		patch(endpoint: RESTEndpoint, payload?: unknown) {
			return request(endpoint, RESTMethod.Patch, payload);
		},
	};
}

export function getRoute(endpoint: string, method: RESTMethod): string {
	const { pathname } = new URL(endpoint, "https://discord.com");

	if (pathname.startsWith("/interactions/") && pathname.endsWith("/callback")) {
		return "/interactions/:id/:token/callback";
	}

	let route = pathname
		.replace(/\d{17,19}/g, ":id")
		.replace(/\/reactions\/.+$/, "/reactions/:reaction")
		.replace(/\/webhooks\/:id\/[^/?]+/, "/webhooks/:id/:token");

	if (method === RESTMethod.Delete && route === "/channels/:id/messages/:id") {
		const messageId = pathname.match(/\d{17,19}$/)?.[0];

		if (messageId) {
			const timestamp = Number(messageId) >> 22;
			if (Date.now() - timestamp > 1_209_600_000) {
				route += "/old";
			}
		}
	}

	return route;
}
