import { defineConfig, type UserConfig } from "tsdown";

export function makeConfig(...options: Partial<UserConfig>[]) {
	const isProduction = process.env["NODE_ENV"] === "production";

	const makeDefault = (opts: Partial<UserConfig>): UserConfig => ({
		format: ["cjs", "esm"],
		sourcemap: !isProduction,
		dts: true,
		clean: true,
		outDir: "dist",
		target: "es2022",
		treeshake: true,
		...opts,
	});

	return defineConfig(options.map(makeDefault));
}
