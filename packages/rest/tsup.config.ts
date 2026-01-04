import { makeConfig } from "../../tsup.config.js";

export default makeConfig({
	entry: ["src/index.ts"],
	external: ["ws"],
});
