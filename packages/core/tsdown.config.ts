import { defineConfig } from "tsdown";
import rootConfig from "../../tsdown.config";

// biome-ignore lint/style/noDefaultExport: tsdown uses default export for main config
export default defineConfig({
	...rootConfig,
	entry: ["src/index.ts", "src/discord-types.ts"],
});
