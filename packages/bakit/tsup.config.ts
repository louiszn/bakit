import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: {
			cli: "src/cli/bin.ts",
			hooks: "src/lib/loader/hooks.ts",
			register: "src/lib/loader/register.ts",
		},
		outDir: "dist",
		dts: false,
		external: ["bakit", "esbuild"],
	},
);
