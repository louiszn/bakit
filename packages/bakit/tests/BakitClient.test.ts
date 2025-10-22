import { describe, expect, it } from "vitest";
import { inspect } from "util";

import { BakitClient } from "../src/BakitClient.js";

describe("BakitClient behavior test", () => {
	it("hides BakitClient data when inspected", () => {
		const client = new BakitClient({
			intents: [],
		});

		const inspected = inspect(client);

		expect(inspected).toBe(`BakitClient {}`);
	});
});
