import { makeConfig } from "../../tsup.config.js";

export default makeConfig(
	{
		entry: ["src/index.ts"],
	},
	{
		entry: ["src/bin/bakit.ts"],
		outDir: "dist/bin",
	},
);
