import { defineConfig } from "tsup";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
	entry: ["src/index.ts", "src/command/index.ts"],
	format: "esm",
	sourcemap: !isProduction,
	dts: true,
	clean: true,
	minify: false,
	splitting: false,
	outDir: "dist",
	target: "es2022",
});
