import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: {
			cli: "src/lib/cli/index.ts",
		},
		dts: false,
	},
);
