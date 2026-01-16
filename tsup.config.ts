import { defineConfig, type Options } from "tsup";

export function makeConfig(...options: Partial<Options>[]) {
	const isProduction = process.env["NODE_ENV"] === "production";

	const makeDefault = (opts: Partial<Options>): Options => ({
		format: "esm",
		sourcemap: !isProduction,
		dts: true,
		clean: true,
		minify: false,
		splitting: false,
		outDir: "dist",
		target: "es2022",
		treeshake: true,
		minifySyntax: true,
		external: [/^(?!(?:\.{0,2}\/|@\/))/], // match anything that doesn't start with ./, ../, /, @/
		...opts,
	});

	return defineConfig(options.map(makeDefault));
}
