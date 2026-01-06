import { createQueue, sleep } from "@bakit/utils";
import { DiscordHTTPError, type DiscordHTTPValidationError } from "./errors/DiscordHTTPError.js";

export interface BucketOptions {
	hash: string;
}

// TODO: Handle global ratelimit
export function createBucket(_options: BucketOptions) {
	const queue = createQueue({
		autoStart: true,
		concurrency: 2,
	});

	let resetAt = 0;
	let remaining = Infinity;

	const bucket = {
		request,
	};

	function request(url: string, init: RequestInit) {
		return queue.add(() => makeRequest(url, init));
	}

	async function makeRequest(url: string, init: RequestInit, attempt = 0) {
		const resetAfter = resetAt - Date.now();

		if (remaining <= 0 && resetAfter > 0) {
			await sleep(resetAfter);
		}

		const res = await fetch(url, init);

		const xRemaining = res.headers.get("x-ratelimit-remaining");
		const xReset = res.headers.get("x-ratelimit-reset");

		if (remaining) {
			remaining = Number(xRemaining);
		} else {
			remaining = Math.max(remaining - 1, 0);
		}

		resetAt = Number(xReset) * 1_000;

		const data = await resolveResponse(res);

		if (res.status === 429) {
			const retryAfter = resetAt - Date.now();
			await sleep(retryAfter);

			return await makeRequest(url, init, attempt + 1);
		}

		if (res.ok) {
			return data;
		}

		if (typeof data === "object") {
			throw new DiscordHTTPError(data as DiscordHTTPValidationError);
		}

		throw new Error("An unknown error occurred");
	}

	async function resolveResponse(res: Response) {
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
