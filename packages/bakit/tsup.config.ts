import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: { cli: "src/cli/bin.ts" },
		outDir: "dist",
		dts: false,
	},
);
