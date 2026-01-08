import { Collection, createQueue, sleep } from "@bakit/utils";

import { DiscordHTTPError, type DiscordHTTPValidationError } from "./errors/DiscordHTTPError.js";

/**
 * Represents a single rate limit bucket.
 *
 * A bucket serializes requests (concurrency = 1) and tracks
 * Discord rate limit headers such as remaining requests and reset time.
 *
 * Buckets may be shared across multiple routes if Discord identifies
 * them as the same rate limit bucket.
 */
export interface RESTBucket {
	/** Number of queued requests */
	readonly size: number;

	/** Timestamp (ms) when this bucket resets */
	readonly resetAt: number;

	/** Remaining requests before hitting the rate limit */
	readonly remaining: number;

	/**
	 * Queue and execute a request through this bucket.
	 * Requests are executed sequentially.
	 */
	request(route: string, url: string, init: RequestInit): Promise<unknown>;
}

/**
 * Manages rate limit buckets and global rate limits.
 */
export interface RESTBucketManager {
	/**
	 * Wait until the global rate limit resets (if active).
	 */
	wait(): Promise<void>;

	/**
	 * Apply a global rate limit returned by Discord.
	 * This affects all buckets.
	 */
	updateGlobalRateLimit(restryAfter: number): void;

	/**
	 * Get or create a bucket for a route shape.
	 */
	use(route: string): RESTBucket;

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
	setIdentifiedBucket(route: string, bucketId: string): RESTBucket;
}

export function createRESTBucketManager(): RESTBucketManager {
	// Timestamp (ms) when the global rate limit resets
	let globalResetAt = 0;

	// Shared promise so concurrent waiters don't create multiple timers
	let waiting: Promise<void> | undefined;

	// AbortController used to interrupt sleep when the limit changes
	let controller: AbortController | undefined;

	const buckets = new Collection<string, RESTBucket>();
	const identifiedBuckets = new Collection<string, RESTBucket>();

	const manager: RESTBucketManager = {
		wait,
		updateGlobalRateLimit,
		use: useBucket,
		setIdentifiedBucket,
	};

	/**
	 * Global rate limits are shared across all buckets.
	 *
	 * If Discord extends the global reset time while requests are waiting,
	 * the current wait will be aborted and restarted using the new reset time.
	 */
	async function wait() {
		if (Date.now() >= globalResetAt) return;

		waiting ??= (async () => {
			while (Date.now() < globalResetAt) {
				controller ??= new AbortController();

				try {
					await sleep(globalResetAt - Date.now(), controller.signal);
				} catch (error) {
					if (!(error instanceof DOMException && error.name === "AbortError")) {
						throw error;
					}

					controller = undefined;
				}
			}
			waiting = undefined;
		})();

		return waiting;
	}

	async function updateGlobalRateLimit(retryAfter: number) {
		globalResetAt = Math.max(globalResetAt, Date.now() + retryAfter);
		controller?.abort();
	}

	function useBucket(route: string) {
		let bucket = buckets.get(route);

		if (!bucket) {
			bucket = createRESTBucket(manager);
			buckets.set(route, bucket);
		}

		return bucket;
	}

	/**
	 * A bucket is initially created as a temporary "bootstrap" bucket
	 * to handle queue and rate-limited requests.
	 *
	 * After a request is made, Discord may respond with an
	 * `X-RateLimit-Bucket` header that identifies the canonical bucket
	 * for that route.
	 *
	 * A single Discord-identified bucket may be shared by multiple routes
	 * that are subject to the same rate limit.
	 */
	function setIdentifiedBucket(route: string, bucketId: string) {
		const identified = identifiedBuckets.get(bucketId);
		if (identified) {
			buckets.set(route, identified);
			return identified;
		}

		const existing = buckets.get(route);
		if (existing) {
			identifiedBuckets.set(bucketId, existing);
			return existing;
		}

		const bucket = createRESTBucket(manager);
		buckets.set(route, bucket);
		identifiedBuckets.set(bucketId, bucket);
		return bucket;
	}

	return manager;
}

export function createRESTBucket(manager: RESTBucketManager): RESTBucket {
	// Buckets are strictly serialized.
	// Discord rate limits are per-bucket and sequential execution avoids
	// race conditions when updating remaining/resetAt.
	const queue = createQueue({
		autoStart: true,
		concurrency: 1,
	});

	let resetAt = 0;
	let remaining = Infinity; // Unknown until the first response provides rate limit headers

	const bucket: RESTBucket = {
		get size() {
			return queue.size;
		},
		get resetAt() {
			return resetAt;
		},
		get remaining() {
			return remaining;
		},

		request(route, url, init) {
			return queue.add(() => makeRequest(route, url, init));
		},
	};

	/**
	 * Execute a single HTTP request with rate limit handling.
	 *
	 * Handles:
	 * - Global rate limits
	 * - Per-bucket rate limits
	 * - 429 retries (including global limits)
	 * - Bucket identification via response headers
	 */
	async function makeRequest(route: string, url: string, init: RequestInit, attempt = 0) {
		// Prevent infinite retry loops if Discord continuously returns 429
		if (attempt > 5) {
			throw new Error("Too many retries due to rate limits");
		}

		// Respect global rate limits first
		await manager.wait();

		const resetAfter = resetAt - Date.now();

		// Prevent requests when the bucket is exhausted
		if (remaining <= 0 && resetAfter > 0) {
			await sleep(resetAfter);
		}

		const res = await fetch(url, init);

		const xRemaining = res.headers.get("x-ratelimit-remaining");
		const xResetAfter = res.headers.get("x-ratelimit-reset-after");
		const xBucket = res.headers.get("x-ratelimit-bucket");

		if (xRemaining !== null) {
			remaining = Number(xRemaining);
		} else {
			remaining = Math.max(remaining - 1, 0);
		}

		if (xResetAfter !== null) {
			resetAt = Date.now() + Number(xResetAfter) * 1_000;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any = await resolveResponse(res);

		if (res.status === 429) {
			remaining = 0; // Prevent phantom remaining counter for later requests

			// `retryAfter` from the body is more accurate and could be global rate limit
			const retryAfter = data.retry_after * 1_000;
			resetAt = Math.max(resetAt, Date.now() + retryAfter);

			if (data.global) {
				// Apply the rate limit to all buckets
				manager.updateGlobalRateLimit(retryAfter);
			}

			return await makeRequest(route, url, init, attempt + 1);
		}

		// Discord will send the real bucket ID for specific routes
		if (xBucket) {
			manager.setIdentifiedBucket(route, xBucket);
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

	async function resolveResponse(res: Response): Promise<unknown> {
		const contentType = res.headers.get("content-type");

		if (!contentType) {
			return;
		}

		if (contentType.startsWith("application/json")) {
			return await res.json();
		}

		return await res.text();
	}

	return bucket;
}
