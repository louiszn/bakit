import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
		external: ["bakit/loader/register"],
	},
	{
		entry: { cli: "src/cli/bin.ts" },
		outDir: "dist",
		dts: false,
	},
	{
		entry: ["src/loader/**/*.ts"],
		outDir: "dist/loader",
		external: ["esbuild"],
		dts: false,
	},
);
