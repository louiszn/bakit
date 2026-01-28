import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { REST, type RESTRouteMeta } from "@/index.js";

// Global fetch mock
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function route(route: string, scopeId = "global"): RESTRouteMeta {
	return { route, scopeId } as RESTRouteMeta;
}

function mockResponse({
	status = 200,
	headers = {},
	body = {},
}: {
	status?: number;
	headers?: Record<string, string>;
	body?: unknown;
}) {
	return {
		ok: status >= 200 && status < 300,
		status,
		headers: {
			get: (key: string) => headers[key.toLowerCase()] ?? null,
		},
		json: async () => body,
		text: async () => JSON.stringify(body),
	} as unknown as Response;
}

describe("RESTBucketManager", () => {
	beforeEach(() => {
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("reuses the same bucket for the same route + scope", () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const r = route("/users/:id");

		const a = manager.use(r);
		const b = manager.use(r);

		expect(a).toBe(b);
	});

	it("creates different buckets for different scopes", () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const a = manager.use(route("/users/:id", "a"));
		const b = manager.use(route("/users/:id", "b"));

		expect(a).not.toBe(b);
	});

	it("shares identified buckets across routes", () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const r1 = route("/guilds/:id");
		const r2 = route("/channels/:id");

		const b1 = manager.use(r1);
		manager.setIdentifiedBucket(r1, "bucket-123");

		const b2 = manager.setIdentifiedBucket(r2, "bucket-123");

		expect(b1).toBe(b2);
	});
});

describe("RESTBucket behavior", () => {
	beforeEach(() => {
		fetchMock.mockReset();
	});

	it("executes requests sequentially (concurrency = 1)", async () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const bucket = manager.use(route("/test"));

		const order: number[] = [];

		fetchMock
			.mockResolvedValueOnce(mockResponse({ body: { value: 1 } }))
			.mockResolvedValueOnce(mockResponse({ body: { value: 2 } }));

		await Promise.all([
			bucket.request(route("/test"), "/a", {}).then(() => order.push(1)),
			bucket.request(route("/test"), "/b", {}).then(() => order.push(2)),
		]);

		expect(order).toEqual([1, 2]);
	});

	it("retries on 429 and eventually succeeds", async () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const bucket = manager.use(route("/retry"));

		fetchMock
			.mockResolvedValueOnce(
				mockResponse({
					status: 429,
					headers: {
						"content-type": "application/json",
					},
					body: {
						retry_after: 0.01,
						global: false,
					},
				}),
			)
			.mockResolvedValueOnce(
				mockResponse({
					status: 200,
					headers: {
						"content-type": "application/json",
					},
					body: { ok: true },
				}),
			);

		const result = await bucket.request(route("/retry"), "/x", {});
		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("applies global rate limits across all buckets", async () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const a = manager.use(route("/a"));
		const b = manager.use(route("/b"));

		fetchMock.mockResolvedValue(
			mockResponse({
				status: 200,
				headers: {
					"content-type": "application/json",
				},
				body: {},
			}),
		);

		const rateLimit = 50;
		manager.updateGlobalRateLimit(rateLimit);

		const start = Date.now();
		const order: number[] = [];

		const p1 = a.request(route("/a"), "/a", {}).then(() => order.push(Date.now() - start));
		const p2 = b.request(route("/b"), "/b", {}).then(() => order.push(Date.now() - start));

		await Promise.all([p1, p2]);

		expect(order[0]).toBeGreaterThanOrEqual(rateLimit);
		expect(order[1]).toBeGreaterThanOrEqual(rateLimit);
	});

	it("updates remaining and reset headers correctly", async () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const bucket = manager.use(route("/limits"));

		fetchMock.mockResolvedValueOnce(
			mockResponse({
				status: 200,
				headers: {
					"x-ratelimit-remaining": "0",
					"x-ratelimit-reset-after": "0.01",
					"content-type": "application/json",
				},
				body: {},
			}),
		);

		await bucket.request(route("/limits"), "/x", {});

		// Queue size should be zero after request completes
		expect(bucket.size).toBe(0);
	});

	it("throws after too many 429 retries", async () => {
		const rest = new REST({ token: "TOKEN" });
		const manager = rest["buckets"];

		const bucket = manager.use(route("/fail"));

		fetchMock.mockResolvedValue(
			mockResponse({
				status: 429,
				headers: {
					"content-type": "application/json",
				},
				body: {
					retry_after: 0,
					global: false,
				},
			}),
		);

		await expect(bucket.request(route("/fail"), "/x", {})).rejects.toThrow("Too many retries");
	});
});
