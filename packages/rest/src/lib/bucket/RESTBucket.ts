import { sleep } from "@bakit/utils";
import PQueue from "p-queue";

import { DiscordHTTPError, type DiscordHTTPValidationError } from "../errors/DiscordHTTPError.js";

import type { RESTRouteMeta } from "../REST.js";
import type { RESTBucketManager } from "./RESTBucketManager.js";

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
	private queue: PQueue;

	public resetAt = 0;
	public remaining = Infinity;

	public constructor(public readonly manager: RESTBucketManager) {
		this.queue = new PQueue({
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
