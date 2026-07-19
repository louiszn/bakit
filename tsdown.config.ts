import { defineConfig } from "tsdown";

// biome-ignore lint/style/noDefaultExport: tsdown uses default export for main config
export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	exports: true,
	publint: true,
	deps: {
		onlyBundle: [],
	},
});
