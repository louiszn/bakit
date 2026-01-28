import { Collection, sleep, Queue } from "@bakit/utils";

import { DiscordHTTPError, type DiscordHTTPValidationError } from "./errors/DiscordHTTPError.js";
import type { REST, RESTRouteMeta } from "./rest.js";

/**
 * Manages rate limit buckets for REST requests.
 */
export class RESTBucketManager {
	private buckets = new Collection<string, RESTBucket>();
	private identifiedBuckets = new Collection<string, RESTBucket>();

	private waiting: Promise<void> | undefined;
	private controller: AbortController | undefined;

	private globalResetAt = 0;

	public constructor(public readonly rest: REST) {}

	/**
	 * Wait until the global rate limit resets (if active).
	 */
	public async wait(): Promise<void> {
		if (Date.now() >= this.globalResetAt) {
			return;
		}

		this.waiting ??= (async () => {
			while (Date.now() < this.globalResetAt) {
				this.controller ??= new AbortController();

				try {
					await sleep(this.globalResetAt - Date.now(), this.controller.signal);
				} catch (error) {
					if (!(error instanceof DOMException && error.name === "AbortError")) {
						throw error;
					}

					this.controller = undefined;
				}
			}

			this.waiting = undefined;
		})();

		return this.waiting;
	}

	/**
	 * Apply a global rate limit returned by Discord.
	 * This affects all buckets.
	 */
	public updateGlobalRateLimit(retryAfter: number) {
		this.globalResetAt = Math.max(this.globalResetAt, Date.now() + retryAfter);
		this.rest.emit("globalRateLimit", this.globalResetAt - Date.now());
		this.controller?.abort();
	}

	/**
	 * Get or create a bucket for a route shape.
	 */
	public use(routeMeta: RESTRouteMeta): RESTBucket {
		const key = `${routeMeta.route}:${routeMeta.scopeId}`;

		let bucket = this.buckets.get(key);

		if (!bucket) {
			bucket = new RESTBucket(this);
			this.buckets.set(key, bucket);
		}

		return bucket;
	}

	/**
	 * Associate a route with a Discord-identified rate limit bucket.
	 *
	 * Discord may respond with an `X-RateLimit-Bucket` header indicating the
	 * canonical bucket ID for this route. This method binds the route shape
	 * to that bucket so future requests share the same rate limit state.
	 *
	 * @param route - The normalized route shape used for bucket lookup.
	 * @param bucketId - The bucket ID provided by Discord.
	 * @returns The bucket associated with the identified rate limit.
	 */
	public setIdentifiedBucket(routeMeta: RESTRouteMeta, bucketId: string) {
		const { route, scopeId } = routeMeta;

		const bucketKey = `${route}:${scopeId}`;
		const identifiedKey = `${bucketId}:${scopeId}`;

		const identified = this.identifiedBuckets.get(identifiedKey);
		if (identified) {
			this.buckets.set(bucketKey, identified);
			return identified;
		}

		const existing = this.buckets.get(bucketKey);
		if (existing) {
			this.identifiedBuckets.set(identifiedKey, existing);
			return existing;
		}

		const bucket = new RESTBucket(this);

		this.identifiedBuckets.set(identifiedKey, bucket);
		this.buckets.set(bucketKey, bucket);

		return bucket;
	}
}

/**
 * Represents a single rate limit bucket.
 *
 * A bucket serializes requests (concurrency = 1) and tracks
 * Discord rate limit headers such as remaining requests and reset time.
 *
 * Buckets may be shared across multiple routes if Discord identifies
 * them as the same rate limit bucket.
 */
export class RESTBucket {
	private queue: Queue;

	public resetAt = 0;
	public remaining = Infinity;

	public constructor(public readonly manager: RESTBucketManager) {
		this.queue = new Queue({
			autoStart: true,
			concurrency: 1,
		});
	}

	public get size() {
		return this.queue.size;
	}

	public request(routeMeta: RESTRouteMeta, url: string, init: RequestInit, maxRetries?: number) {
		return this.queue.add(() => this.makeRequest(routeMeta, url, init, maxRetries));
	}

	private async makeRequest(
		routeMeta: RESTRouteMeta,
		url: string,
		init: RequestInit,
		maxRetries = 5,
		attempt = 0,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		// Prevent infinite retry loops if Discord continuously returns 429
		if (attempt > maxRetries) {
			throw new Error("Too many retries due to rate limits");
		}

		// Respect global rate limits first
		await this.manager.wait();

		const resetAfter = this.resetAt - Date.now();

		// Prevent requests when the bucket is exhausted
		if (this.remaining <= 0 && resetAfter > 0) {
			await sleep(resetAfter);
		}

		const res = await fetch(url, init);

		const xRemaining = res.headers.get("x-ratelimit-remaining");
		const xResetAfter = res.headers.get("x-ratelimit-reset-after");
		const xReset = res.headers.get("x-ratelimit-reset"); // Absolute timestamp fallback
		const xBucket = res.headers.get("x-ratelimit-bucket");

		if (xRemaining !== null) {
			const parsed = Number(xRemaining);

			if (!Number.isNaN(parsed)) {
				this.remaining = parsed;
			}
		} else {
			this.remaining = Math.max(this.remaining - 1, 0);
		}

		// Prefer reset-after, fallback to reset - now
		if (xResetAfter !== null) {
			const parsed = Number(xResetAfter);

			if (!Number.isNaN(parsed)) {
				this.resetAt = Date.now() + parsed * 1_000;
			}
		} else if (xReset !== null) {
			const parsed = Number(xReset);

			if (!Number.isNaN(parsed)) {
				this.resetAt = parsed * 1_000;
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any = await resolveResponse(res);

		if (res.status === 429) {
			this.remaining = 0;

			// retry_after from body is in seconds
			const retryAfter = (data.retry_after ?? 1) * 1_000;

			// Update resetAt to ensure we wait long enough
			this.resetAt = Math.max(this.resetAt, Date.now() + retryAfter);

			if (data.global) {
				this.manager.updateGlobalRateLimit(retryAfter);
			} else {
				this.manager.rest.emit("rateLimit", routeMeta, retryAfter);
			}

			return await this.makeRequest(routeMeta, url, init, maxRetries, attempt + 1);
		}

		// Discord will send the real bucket ID for specific routes
		if (xBucket) {
			this.manager.setIdentifiedBucket(routeMeta, xBucket);
		}

		if (res.ok) {
			return data;
		}

		if (typeof data === "object") {
			throw new DiscordHTTPError(data as DiscordHTTPValidationError, {
				url,
				...init,
			});
		}

		throw new Error("An unknown error occurred");
	}
}

export async function resolveResponse(res: Response): Promise<unknown> {
	const contentType = res.headers.get("content-type");

	if (!contentType) {
		return;
	}

	if (contentType.startsWith("application/json")) {
		return await res.json();
	}

	return await res.text();
}
