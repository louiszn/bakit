import {
	createTransportClient,
	createTransportServer,
	type Serializable,
	type TransportClientOptions,
	type TransportServer,
	type TransportServerOptions,
} from "@bakit/service";

import { createRESTBucketManager } from "./bucket.js";

import type { OptionalKeysOf, ValueOf } from "type-fest";
import { attachEventBus, type EventBus } from "@bakit/utils";

/**
 * A valid Discord API endpoint.
 * Must always start with `/`.
 */
export type RESTEndpoint = `/${string}`;

/**
 * Supported HTTP methods.
 */
export const RESTMethod = {
	Get: "GET",
	Put: "PUT",
	Post: "POST",
	Patch: "PATCH",
	Head: "HEAD",
	Delete: "DELETE",
} as const;
export type RESTMethod = ValueOf<typeof RESTMethod>;

export type RESTRequestFn = <T = unknown>(endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown) => Promise<T>;

/**
 * High-level REST client interface.
 *
 * Provides typed helper methods for common HTTP verbs while routing
 * all requests through the internal rate limit bucket system.
 */
export interface REST extends EventBus<RESTEvents> {
	request: RESTRequestFn;
	get<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	head<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	delete<T = unknown>(endpoint: RESTEndpoint): Promise<T>;
	post<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
	put<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
	patch<T = unknown, P = unknown>(endpoint: RESTEndpoint, payload?: P): Promise<T>;
}

export interface RESTTransportServer extends REST {
	server: TransportServer;
	listen: TransportServer["listen"];
}

export interface RESTEvents {
	request: [endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown];
}

/**
 * Configuration options for the REST client.
 */
export interface InternalRESTOptions {
	/**
	 * Discord API version to target.
	 * @defaultValue 10
	 */
	version?: number;

	/**
	 * Base API URL.
	 * @defaultValue https://discord.com/api/
	 */
	baseURL?: string;

	/**
	 * Bot token used for authorization.
	 */
	token: string;
}

/**
 * Default REST options.
 */
export const DEFAULT_INTERNAL_REST_OPTIONS = {
	version: 10,
	baseURL: "https://discord.com/api/",
} as const satisfies Pick<InternalRESTOptions, OptionalKeysOf<InternalRESTOptions>>;

export interface RESTDriver {
	request: RESTRequestFn;
}

export type RESTTransportProxyOptions = { method: "transport" } & TransportClientOptions;
export type RESTCustomProxyOptions = { method: "custom"; request: RESTRequestFn };
export type RESTProxyOptions = RESTTransportProxyOptions | RESTCustomProxyOptions;

export type RESTOptions =
	| (InternalRESTOptions & { proxy?: false })
	| ((RESTTransportProxyOptions | RESTCustomProxyOptions) & { proxy: true });

export type RESTTransportServerOptions = InternalRESTOptions & { transport: TransportServerOptions };

export interface RESTRouteMeta {
	scopeId: string;
	route: string;
	original: string;
}

/**
 * Create a REST client instance.
 *
 * All requests are routed through a rate limit bucket manager
 * to ensure compliance with Discord's REST rate limits.
 */
export function createREST(options: RESTOptions): REST {
	const driver = options.proxy ? createRESTProxy(options) : createInternalREST(options);

	const base = {
		request,
		get<T>(endpoint: RESTEndpoint) {
			return request<T>(endpoint, RESTMethod.Get);
		},
		head<T>(endpoint: RESTEndpoint) {
			return request<T>(endpoint, RESTMethod.Head);
		},
		delete<T>(endpoint: RESTEndpoint) {
			return request<T>(endpoint, RESTMethod.Delete);
		},
		post<T>(endpoint: RESTEndpoint, payload?: unknown) {
			return request<T>(endpoint, RESTMethod.Post, payload);
		},
		put<T>(endpoint: RESTEndpoint, payload?: unknown) {
			return request<T>(endpoint, RESTMethod.Put, payload);
		},
		patch<T>(endpoint: RESTEndpoint, payload?: unknown) {
			return request<T>(endpoint, RESTMethod.Patch, payload);
		},
	};

	const self = attachEventBus<RESTEvents, typeof base>(base);

	function request<T>(endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown) {
		self.emit("request", endpoint, method, payload);
		return driver.request<T>(endpoint, method, payload);
	}

	return self;
}

export function createInternalREST(options: InternalRESTOptions): RESTDriver {
	const resolvedOptions = { ...DEFAULT_INTERNAL_REST_OPTIONS, ...options };

	// Base API URL including version
	const baseURL = new URL(`v${resolvedOptions.version}`, resolvedOptions.baseURL).toString();

	// Central rate limit manager shared by all requests
	const buckets = createRESTBucketManager();

	/**
	 * Perform a raw REST request.
	 *
	 * The endpoint is normalized into a route shape which determines
	 * the rate limit bucket used for this request.
	 */
	async function request<T = unknown>(endpoint: RESTEndpoint, method: RESTMethod, payload?: unknown): Promise<T> {
		// Normalize the endpoint into a Discord route shape
		const routeMeta = getRouteMeta(endpoint, method);

		// Get or create the corresponding rate limit bucket
		const bucket = buckets.use(routeMeta);

		// Resolve the full request URL
		const url = new URL(endpoint.slice(1), baseURL).toString();

		const init: RequestInit = {
			method,
			headers: {
				Authorization: `Bot ${resolvedOptions.token}`,
				"Content-Type": "application/json",
			},
		};

		if (payload !== undefined) {
			init.body = JSON.stringify(payload);
		}

		// Execute the request through the bucket queue
		const res = await bucket.request(routeMeta, url, init);
		return res as T;
	}

	return {
		request,
	};
}

export function createRESTProxy(options: RESTProxyOptions): RESTDriver {
	if (options.method === "custom") {
		return {
			request: options.request,
		};
	}

	const client = createTransportClient(options);
	client.connect();

	return {
		request(endpoint, method, payload) {
			return client.request("makeRequest", endpoint, method, payload as Serializable);
		},
	};
}

export function createRESTTransportServer(options: RESTTransportServerOptions): RESTTransportServer {
	const rest = createREST(options);
	const server = createTransportServer(options.transport);

	server.handle("makeRequest", (endpoint: RESTEndpoint, method: RESTMethod, payload) => {
		console.log("Received request", { endpoint, method, payload });
		return rest.request<Serializable>(endpoint, method, payload);
	});

	return Object.assign(rest, {
		server,
		listen: server.listen,
	});
}

/**
 * Route metadata extraction inspired by Discord.js' REST bucket design.
 *
 * Discord calculates rate limits per route and per top-level resource
 * (channel, guild, webhook), so we extract a normalized route and a
 * scope ID to correctly shard rate limit buckets.
 */
export function getRouteMeta(endpoint: string, method: RESTMethod): RESTRouteMeta {
	// Prevents params to be included
	const { pathname } = new URL(endpoint, "https://discord.com");

	// Interaction callbacks use a special shared bucket
	if (pathname.startsWith("/interactions/") && pathname.endsWith("/callback")) {
		return {
			scopeId: "global",
			route: "/interactions/:id/:token/callback",
			original: endpoint,
		};
	}

	// Extract the top-level resource identifier ("scope") for this route.
	//
	// Discord rate limits are calculated per top-level resource
	// (e.g. channel_id, guild_id, webhook_id).
	//
	// Requests with the same route but different scope IDs can be
	// executed in parallel without sharing the same rate limit bucket.
	const scopeId = extractScopeId(pathname);

	let route = pathname
		// Replace snowflake IDs
		.replace(/\d{17,19}/g, ":id")
		// Normalize reaction endpoints
		.replace(/\/reactions\/.+$/, "/reactions/:reaction")
		// Normalize webhook tokens
		.replace(/\/webhooks\/:id\/[^/?]+/, "/webhooks/:id/:token");

	/**
	 * Discord applies a separate rate limit bucket for deleting
	 * messages older than 14 days.
	 */
	if (method === RESTMethod.Delete && route === "/channels/:id/messages/:id") {
		const messageId = pathname.match(/\d{17,19}$/)?.[0];

		if (messageId) {
			// Discord snowflake timestamp (ms)
			const timestamp = Number(BigInt(messageId) >> 22n);

			// 14 days in milliseconds
			if (Date.now() - timestamp > 1_209_600_000) {
				route += "/old";
			}
		}
	}

	return {
		scopeId,
		route,
		original: endpoint,
	};
}

export function extractScopeId(pathname: string): string {
	const match = /^(?:\/webhooks\/(?<webhook>\d{17,19}\/[^/?]+)|\/(?:channels|guilds|webhooks)\/(?<id>\d{17,19}))/.exec(
		pathname,
	);

	return match?.groups?.["id"] ?? match?.groups?.["webhook"] ?? "global";
}
