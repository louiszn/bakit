import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
	title: "Bakit",
	tagline: "The most powerful Discord.js framework",
	favicon: "img/favicon.ico",

	future: {
		v4: true,
	},

	url: "https://your-docusaurus-site.example.com",
	baseUrl: "/",

	organizationName: "louiszn",
	projectName: "bakit",

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					editUrl: "https://github.com/louiszn/bakit/tree/main/apps/docs",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	plugins: [
		[
			"docusaurus-plugin-typedoc",
			{
				entryPoints: ["../../packages/bakit/src/index.ts"],
				tsconfig: "../../packages/bakit/tsconfig.json",
				sidebar: {
					autoConfiguration: true,
					pretty: true,
					typescript: true,
				},
			},
		],
	],

	themeConfig: {
		colorMode: {
			defaultMode: "dark",
			disableSwitch: true,
		},
		image: "img/docusaurus-social-card.jpg",
		navbar: {
			title: "Bakit",
			// logo: {
			// 	alt: "My Site Logo",
			// 	src: "img/logo.svg",
			// },
			items: [
				{
					type: "docSidebar",
					sidebarId: "sidebar",
					position: "left",
					label: "Docs",
				},
				{
					href: "https://github.com/louiszn/bakit",
					position: "right",
					className: "header-github-link",
					"aria-label": "GitHub repository",
				},
			],
		},
		footer: {
			links: [
				{
					title: "Resource",
					items: [
						{
							label: "Docs",
							to: "/docs/introduction",
						},
					],
				},
				{
					title: "Community",
					items: [
						{
							label: "Discord",
							href: "https://discord.gg/pGnKbMfXke",
						},
					],
				},
				{
					title: "More",
					items: [
						{ label: "NPM", href: "https://www.npmjs.com/package/bakit" },
						{ label: "Github", href: "https://github.com/louiszn/bakit" },
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Bakit. Built with Docusaurus.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
		algolia: {
			appId: "NWXZRCVUW5",
			apiKey: "cdcc4532fa384be9d050026a313db633",
			indexName: "bakit",
			contextualSearch: true,
			replaceSearchResultPathname: {
				from: "/docs/",
				to: "/",
			},
			searchParameters: {},
			searchPagePath: "search",
			insights: false,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
