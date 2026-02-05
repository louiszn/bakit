import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: {
			cluster: "src/lib/internal/cluster.ts",
		},
		dts: false,
	},
);
