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
		ignores: ["**/dist/**", "**/node_modules/**"],
	},
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				project: ["tsconfig.json", "./packages/*/tsconfig.json", "./apps/*/tsconfig.json"],
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
			"prettier/prettier": "error",
		},
	},
);
