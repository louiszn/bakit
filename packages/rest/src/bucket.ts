import { Collection, createQueue, sleep } from "@bakit/utils";

import { DiscordHTTPError, type DiscordHTTPValidationError } from "./errors/DiscordHTTPError.js";

export interface RESTBucket {
	readonly size: number;
	readonly resetAt: number;
	readonly remaining: number;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	request(route: string, url: string, init: RequestInit): Promise<any>;
}

export interface RESTBucketManager {
	wait(): Promise<void>;
	updateGlobalRateLimit(restryAfter: number): void;
	use(route: string): RESTBucket;
	setIdentifiedBucket(route: string, bucketId: string): RESTBucket;
}

export function createRESTBucketManager(): RESTBucketManager {
	let globalResetAt = 0;

	const buckets = new Collection<string, RESTBucket>();
	const identifiedBuckets = new Collection<string, RESTBucket>();

	const manager: RESTBucketManager = {
		async wait() {
			const wait = globalResetAt - Date.now();

			if (wait > 0) {
				await sleep(wait);
			}
		},
		updateGlobalRateLimit(retryAfter) {
			globalResetAt = Date.now() + retryAfter;
		},
		use: useBucket,
		setIdentifiedBucket,
	};

	function useBucket(route: string) {
		let bucket = buckets.get(route);

		if (!bucket) {
			bucket = createRESTBucket(manager);
			buckets.set(route, bucket);
		}

		return bucket;
	}

	function setIdentifiedBucket(route: string, bucketId: string) {
		let bucket = identifiedBuckets.get(bucketId);

		if (bucket) {
			buckets.set(route, bucket);
			return bucket;
		}

		bucket = buckets.get(route);
		if (bucket) {
			identifiedBuckets.set(bucketId, bucket);
			return bucket;
		}

		bucket = createRESTBucket(manager);

		buckets.set(route, bucket);
		identifiedBuckets.set(bucketId, bucket);

		return bucket;
	}

	return manager;
}

export function createRESTBucket(manager: RESTBucketManager): RESTBucket {
	const queue = createQueue({
		autoStart: true,
		concurrency: 2,
	});

	let resetAt = 0;
	let remaining = Infinity;

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

	async function makeRequest(route: string, url: string, init: RequestInit, attempt = 0) {
		if (attempt > 5) {
			throw new Error("Too many retries due to rate limits");
		}

		await manager.wait();

		const resetAfter = resetAt - Date.now();

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

		const data = await resolveResponse(res);

		if (res.status === 429) {
			const retryAfter = data.retry_after * 1_000;
			resetAt = Math.max(resetAt, Date.now() + retryAfter);

			if (data.global) {
				manager.updateGlobalRateLimit(retryAfter);
			}

			return await makeRequest(route, url, init, attempt + 1);
		}

		if (xBucket) {
			manager.setIdentifiedBucket(route, xBucket);
		}

		if (res.ok) {
			return data;
		}

		if (typeof data === "object") {
			throw new DiscordHTTPError(data as DiscordHTTPValidationError);
		}

		throw new Error("An unknown error occurred");
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async function resolveResponse(res: Response): Promise<any> {
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
