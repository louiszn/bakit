import type { BakitClient } from "../client/BakitClient.js";

export class BaseClientManager {
	public constructor(public client: BakitClient) {}
}
