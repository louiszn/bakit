import { RESTBucketManager } from "./bucket.js";

import type { OptionalKeysOf, ValueOf } from "type-fest";
import EventEmitter from "node:events";

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

export class REST extends EventEmitter<RESTEvents> {
	public options: RESTOptions;

	protected buckets: RESTBucketManager;

	public constructor(options: RESTOptions) {
		super();

		this.options = { ...DEFAULT_REST_OPTIONS, ...options };

		this.buckets = new RESTBucketManager(this);
	}

	public get baseURL() {
		return new URL(`v${this.options.version}/`, this.options.baseURL);
	}

	public async request<T = unknown>(
		endpoint: RESTEndpoint,
		method: RESTMethod,
		options: RESTRequestOptions = {},
	): Promise<T> {
		const routeMeta = getRouteMeta(endpoint, method);
		const bucket = this.buckets.use(routeMeta);
		const url = new URL(endpoint.slice(1), this.baseURL);

		if (options.query) {
			for (const [key, value] of Object.entries(options.query)) {
				if (value !== undefined) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		const headers = new Headers({
			...options?.headers,
			Authorization: `Bot ${this.options.token}`,
			"Content-Type": "application/json",
			"User-Agent": this.options.userAgent ?? "DiscordBot (https://github.com/bakit, 1.0.0)",
		});

		const init: RequestInit = {
			...(options as Omit<RESTRequestOptions, "body">),
			method,
			headers,
		};

		if (options?.body) {
			init.body = JSON.stringify(options.body);
		}

		// Execute the request through the bucket queue
		const res = await bucket.request(routeMeta, url.toString(), init, options.maxRetries);

		return res as T;
	}

	public get<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "GET", options);
	}

	public head<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "HEAD", options);
	}

	public delete<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "DELETE", options);
	}

	public post<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "POST", options);
	}

	public put<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "PUT", options);
	}

	public patch<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "PATCH", options);
	}
}

export class RESTProxy extends EventEmitter<RESTProxyEvents> {
	public constructor(public readonly options: RESTProxyOptions) {
		super();
	}

	public request<T = unknown>(
		endpoint: RESTEndpoint,
		method: RESTMethod,
		options: RESTRequestOptions = {},
	): Promise<T> {
		this.emit("request", endpoint, method, options);
		return this.options.request(endpoint, method, options);
	}

	public get<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "GET", options);
	}

	public head<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "HEAD", options);
	}

	public delete<T = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions): Promise<T> {
		return this.request(endpoint, "DELETE", options);
	}

	public post<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "POST", options);
	}

	public put<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "PUT", options);
	}

	public patch<T = unknown, B = unknown>(endpoint: RESTEndpoint, options?: RESTRequestOptions<B>): Promise<T> {
		return this.request(endpoint, "PATCH", options);
	}
}

/**
 * Create a REST client instance.
 *
 * All requests are routed through a rate limit bucket manager
 * to ensure compliance with Discord's REST rate limits.
 *
 * @deprecated Use {@link REST} instead
 */
export function createREST(options: RESTOptions): REST {
	return new REST(options);
}

/**
 * Create a REST proxy instance.
 *
 * All requests are routed through a rate limit bucket manager
 * to ensure compliance with Discord's REST rate limits.
 *
 * @deprecated Use {@link RESTProxy} instead
 */
export function createRESTProxy(options: RESTProxyOptions): RESTProxy {
	return new RESTProxy(options);
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
