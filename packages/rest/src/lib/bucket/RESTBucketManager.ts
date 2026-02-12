import { Collection } from "@discordjs/collection";
import { sleep } from "@bakit/utils";

import { RESTBucket } from "./RESTBucket.js";

import type { REST, RESTRouteMeta } from "../REST.js";

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
