import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: ["src/services/*.ts"],
		outDir: "dist/services",
	},
);
