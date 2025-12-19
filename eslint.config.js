// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	prettier,
	{
		ignores: ["**/dist/**", "**/node_modules/**"],
	},
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},
	{
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/dot-notation": "off",
			"prettier/prettier": "error",
		},
	},
);
