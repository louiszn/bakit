import { describe, it, expect, vi, beforeEach } from "vitest";
import { createREST, getRouteMeta, extractScopeId, RESTMethod } from "@/index.js";

const bucketRequestMock = vi.fn();

vi.mock("@/bucket.js", () => ({
	createRESTBucketManager: vi.fn(() => ({
		use: vi.fn(() => ({
			request: bucketRequestMock,
		})),
	})),
}));

beforeEach(() => {
	bucketRequestMock.mockReset();
});

describe("extractScopeId", () => {
	const cases: Array<[string, string]> = [
		["/channels/123456789012345678/messages", "123456789012345678"],
		["/guilds/123456789012345678/members", "123456789012345678"],
		["/webhooks/123456789012345678/abcdef", "123456789012345678/abcdef"],
		["/users/@me", "global"],
	];

	it.each(cases)("extracts scope from %s", (pathname, expected) => {
		expect(extractScopeId(pathname)).toBe(expected);
	});
});

describe("getRouteMeta", () => {
	it("normalizes snowflake ids", () => {
		const meta = getRouteMeta("/channels/123456789012345678/messages/987654321098765432", RESTMethod.Get);

		expect(meta).toMatchObject({
			route: "/channels/:id/messages/:id",
			scopeId: "123456789012345678",
		});
	});

	it("normalizes reactions", () => {
		const meta = getRouteMeta("/channels/1447158057233813514/reactions/%F0%9F%91%8D/@me", RESTMethod.Get);

		expect(meta.route).toBe("/channels/:id/reactions/:reaction");
	});

	it("uses shared bucket for interaction callbacks", () => {
		const meta = getRouteMeta("/interactions/1447158057233813514/abc/callback", RESTMethod.Post);

		expect(meta).toMatchObject({
			scopeId: "global",
			route: "/interactions/:id/:token/callback",
		});
	});

	it("adds /old bucket for deleting old messages", () => {
		const timestamp = Date.now() - 1_209_600_000 - 1_000;
		const snowflake = (BigInt(timestamp) << 22n).toString();

		const meta = getRouteMeta(`/channels/1447158057233813514/messages/${snowflake}`, RESTMethod.Delete);

		expect(meta.route).toBe("/channels/:id/messages/:id/old");
	});
});

describe("createREST", () => {
	it("routes request through bucket", async () => {
		bucketRequestMock.mockResolvedValueOnce({ ok: true });

		const rest = createREST({ token: "TOKEN" });
		const res = await rest.get("/users/@me");

		expect(res).toEqual({ ok: true });
		expect(bucketRequestMock).toHaveBeenCalledOnce();
	});

	it("passes correct request data", async () => {
		bucketRequestMock.mockResolvedValueOnce({});

		const rest = createREST({ token: "TOKEN" });
		await rest.get("/users/@me");

		const [, url, init] = bucketRequestMock.mock.calls[0]!;

		expect(url).toContain("/users/@me");
		expect(init).toMatchObject({
			method: "GET",
			headers: { Authorization: "Bot TOKEN" },
		});
	});

	it("stringifies payload for POST", async () => {
		bucketRequestMock.mockResolvedValueOnce({});

		const rest = createREST({ token: "TOKEN" });
		await rest.post("/channels/1447158057233813514/messages", { content: "hi" });

		const [, , init] = bucketRequestMock.mock.calls[0]!;

		expect(init).toMatchObject({
			method: "POST",
			body: JSON.stringify({ content: "hi" }),
		});
	});

	it("supports all HTTP helpers", async () => {
		bucketRequestMock.mockResolvedValue({});

		const rest = createREST({ token: "TOKEN" });

		await Promise.all([
			rest.get("/a"),
			rest.head("/a"),
			rest.delete("/a"),
			rest.post("/a", {}),
			rest.put("/a", {}),
			rest.patch("/a", {}),
		]);

		expect(bucketRequestMock).toHaveBeenCalledTimes(6);
	});
});
