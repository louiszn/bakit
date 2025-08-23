// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.recommendedTypeChecked,
	prettier,
	{
		ignores: ["dist"],
	},
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				project: "./tsconfig.eslint.json",
			},
		},
	},
	{
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"prettier/prettier": "error",
		},
	},
);
