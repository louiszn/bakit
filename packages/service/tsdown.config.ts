import { makeConfig } from "../../tsdown.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: { service: "src/lib/internal/service.ts" },
		dts: false,
	},
);
