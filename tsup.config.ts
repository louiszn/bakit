import { defineConfig, Options } from "tsup";

export function makeConfig(options?: Options) {
	const isProduction = process.env.NODE_ENV === "production";

	return defineConfig({
		format: "esm",
		sourcemap: !isProduction,
		dts: true,
		clean: true,
		minify: false,
		splitting: false,
		outDir: "dist",
		target: "es2022",
		treeshake: true,
		esbuildOptions(options) {
			options.minifySyntax = true;
		},
		...options,
	});
}
