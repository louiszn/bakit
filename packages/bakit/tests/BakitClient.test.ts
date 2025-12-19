import { describe, expect, it } from "vitest";
import { inspect } from "node:util";
import { join } from "node:path";

import { BakitClient, loadConfig } from "../src/index.js";

describe("BakitClient behavior test", () => {
	it("hides BakitClient data when inspected", async () => {
		await loadConfig(join(process.cwd(), "tests"));

		const client = new BakitClient(
			{
				intents: [],
			},
			{} as never,
		);

		const inspected = inspect(client);

		expect(inspected).toBe(`BakitClient {}`);
	});
});
