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

/**
 * Extended request options matching Fetch API RequestInit
 * with Discord-specific enhancements.
 */
export interface RESTRequestOptions<Body = unknown> extends Omit<RequestInit, "method" | "body"> {
	/** Query parameters for GET requests */
	query?: Record<string, string | number | boolean | undefined>;

	/** Request body (automatically serialized to JSON unless FormData) */
	body?: Body;

	/** Custom headers (will be merged with default headers) */
	headers?: Record<string, string>;

	/** Maximum number of retries (default: 5) */
	maxRetries?: number;
}

export type RESTRequestFn = <T = unknown>(
	endpoint: RESTEndpoint,
	method: RESTMethod,
	options?: RESTRequestOptions,
) => Promise<T>;

export interface RESTSingleton {
	request: RESTRequestFn;
	get<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T>;
	head<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T>;
	delete<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T>;
	post<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T>;
	put<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T>;
	patch<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T>;
}

/**
 * High-level REST client interface.
 *
 * Provides typed helper methods for common HTTP verbs while routing
 * all requests through the internal rate limit bucket system.
 */
export interface REST extends EventBus<RESTEvents>, RESTSingleton {
	readonly options: RESTOptions;
}

export interface RESTProxy extends EventBus, RESTSingleton {
	readonly options: RESTProxyOptions;
}

export interface RESTEvents {
	request: [endpoint: RESTEndpoint, method: RESTMethod, options?: RESTRequestOptions];
	rateLimit: [metadata: RESTRouteMeta, retryAfter: number];
	globalRateLimit: [retryAfter: number];
}

export interface RESTProxyEvents {
	request: [endpoint: RESTEndpoint, method: RESTMethod, options?: RESTRequestOptions];
}

/**
 * Configuration options for the REST client.
 */
export interface RESTOptions {
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

	/**
	 * User agent string.
	 */
	userAgent?: string;
}

export type RESTProxyOptions = { request: RESTRequestFn };

export interface RESTRouteMeta {
	scopeId: string;
	route: string;
	method: RESTMethod;
	original: RESTEndpoint;
}

/**
 * Default REST options.
 */
export const DEFAULT_REST_OPTIONS = {
	version: 10,
	baseURL: "https://discord.com/api/",
	userAgent: `Bakit (https://github.com/louiszn/bakit, version)`,
} as const satisfies Pick<RESTOptions, OptionalKeysOf<RESTOptions>>;

/**
 * Create a REST client instance.
 *
 * All requests are routed through a rate limit bucket manager
 * to ensure compliance with Discord's REST rate limits.
 */
export function createREST(options: RESTOptions): REST {
	const opts = { ...DEFAULT_REST_OPTIONS, ...options };

	const baseURL = new URL(`v${opts.version}/`, opts.baseURL).toString();

	const base = {
		...createRESTSingleton(request),

		get options() {
			return options;
		},
	};
	const self = attachEventBus<RESTEvents, typeof base>(base);

	const buckets = createRESTBucketManager(self);

	/**
	 * Perform a raw REST request.
	 *
	 * The endpoint is normalized into a route shape which determines
	 * the rate limit bucket used for this request.
	 */
	async function request<T = unknown>(
		endpoint: RESTEndpoint,
		method: RESTMethod,
		reqOptions: RESTRequestOptions = {},
	): Promise<T> {
		// Normalize the endpoint into a Discord route shape
		const routeMeta = getRouteMeta(endpoint, method);

		// Get or create the corresponding rate limit bucket
		const bucket = buckets.use(routeMeta);

		// Resolve the full request URL
		const url = new URL(endpoint.slice(1), baseURL);

		if (reqOptions.query) {
			for (const [key, value] of Object.entries(reqOptions.query)) {
				if (value !== undefined) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		const headers = new Headers({
			...reqOptions?.headers,
			Authorization: `Bot ${opts.token}`,
			"Content-Type": "application/json",
			"User-Agent": opts.userAgent ?? "DiscordBot (https://github.com/bakit, 1.0.0)",
		});

		const init: RequestInit = {
			...(reqOptions as Omit<RESTRequestOptions, "body">),
			method,
			headers,
		};

		if (reqOptions?.body) {
			init.body = JSON.stringify(reqOptions.body);
		}

		// Execute the request through the bucket queue
		const res = await bucket.request(routeMeta, url.toString(), init, reqOptions.maxRetries);

		return res as T;
	}

	return self;
}

export function createRESTProxy(options: RESTProxyOptions): RESTProxy {
	const base = {
		...createRESTSingleton(request),

		get options() {
			return options;
		},
	};
	const self = attachEventBus<RESTProxyEvents, typeof base>(base);

	function request<T>(endpoint: RESTEndpoint, method: RESTMethod, resOptions?: RESTRequestOptions) {
		self.emit("request", endpoint, method, resOptions);
		return options.request<T>(endpoint, method, resOptions);
	}

	return self;
}

function createRESTSingleton(request: RESTRequestFn): RESTSingleton {
	return {
		request,
		get<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Get, reqOptions);
		},
		head<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Head, reqOptions);
		},
		delete<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Delete, reqOptions);
		},
		post<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Post, reqOptions);
		},
		put<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Put, reqOptions);
		},
		patch<T>(endpoint: RESTEndpoint, reqOptions?: RESTRequestOptions) {
			return request<T>(endpoint, RESTMethod.Patch, reqOptions);
		},
	};
}

/**
 * Route metadata extraction inspired by Discord.js' REST bucket design.
 *
 * Discord calculates rate limits per route and per top-level resource
 * (channel, guild, webhook), so we extract a normalized route and a
 * scope ID to correctly shard rate limit buckets.
 */
export function getRouteMeta(endpoint: RESTEndpoint, method: RESTMethod): RESTRouteMeta {
	// Prevents params to be included
	const { pathname } = new URL(endpoint, "https://discord.com");

	// Interaction callbacks use a special shared bucket
	if (pathname.startsWith("/interactions/") && pathname.endsWith("/callback")) {
		return {
			scopeId: "global",
			route: "/interactions/:id/:token/callback",
			method,
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
		method,
		original: endpoint,
	};
}

export function extractScopeId(pathname: string): string {
	const match = /^(?:\/webhooks\/(?<webhook>\d{17,19}\/[^/?]+)|\/(?:channels|guilds|webhooks)\/(?<id>\d{17,19}))/.exec(
		pathname,
	);

	return match?.groups?.["id"] ?? match?.groups?.["webhook"] ?? "global";
}
