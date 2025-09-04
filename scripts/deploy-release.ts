import { simpleGit } from "simple-git";
import { Octokit } from "@octokit/rest";
import { createAppAuth, InstallationAccessTokenAuthentication } from "@octokit/auth-app";

import { readFile, writeFile } from "fs/promises";
import glob from "tiny-glob";
import minimist from "minimist";
import { PackageJson } from "type-fest";

// ------------------------------
// General configuration
// ------------------------------
const GITHUB_CONFIG = {
	owner: "louiszn",
	repo: "bakit",
} as const;

const { BAKIT_APP_SLUG, BAKIT_APP_ID, BAKIT_APP_INSTALLATION_ID, BAKIT_APP_PRIVATE } = process.env;

// ------------------------------
// Parsing arguments
// ------------------------------
interface ParsedArguments {
	version?: string;
}

const args = minimist<ParsedArguments>(process.argv.slice(2));

if (!args.version) {
	throw new Error("Version is required. Use --version vX.Y.Z");
}

// Stable release only has pattern vX.Y.Z
const isPrerelease = Boolean(args.version.split("-")[1]);

// ------------------------------
// Creating github auth
// ------------------------------
const octokit = new Octokit({
	authStrategy: createAppAuth,
	auth: {
		appId: BAKIT_APP_ID,
		privateKey: BAKIT_APP_PRIVATE,
		installationId: BAKIT_APP_INSTALLATION_ID,
	},
});

const installationAuth = (await octokit.auth({
	type: "installation",
})) as InstallationAccessTokenAuthentication;

// ------------------------------
// Helper methods
// ------------------------------
async function bumpVersion(paths: string[], version: string) {
	for (const configPath of paths) {
		console.log(`Bumping version for ${configPath}`);

		const configContent = await readFile(configPath, "utf-8");
		const config = JSON.parse(configContent) as PackageJson;

		// slice the v prefix
		config.version = version.slice(1);

		// Save new package.json file
		// prettier will handle the format on commit stage
		await writeFile(configPath, JSON.stringify(config, null, 4) + "\n", "utf-8");
	}
}

async function pushChanges(paths: string[], version: string) {
	const git = simpleGit();

	await git.addConfig("user.name", `Bakit Bot`);
	await git.addConfig(
		"user.email",
		`${String(BAKIT_APP_ID)}+${String(BAKIT_APP_SLUG)}[bot]@users.noreply.github.com`,
	);

	const tags = await git.tags();

	if (tags.all.includes(version)) {
		throw new Error(`Tag ${version} is already existed.`);
	}

	await git.add(paths);

	await git.commit(`chore(release): ${version}`);

	await git.addTag(version);

	await git.raw([
		"remote",
		"set-url",
		"origin",
		`https://x-access-token:${installationAuth.token}@github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}.git`,
	]);

	await git.push("origin");
	await git.pushTags("origin");

	console.log("Pushed changes successfully");
}

async function createRelease(version: string) {
	const result = await octokit.repos.createRelease({
		owner: GITHUB_CONFIG.owner,
		repo: GITHUB_CONFIG.repo,
		tag_name: version,
		name: args.version,
		generate_release_notes: true,
		prerelease: isPrerelease,
	});

	console.log(`Created release ${version} at ${result.data.html_url}`);
}

// ------------------------------
// Main execution
// ------------------------------
const { version } = args;
const configPaths = await glob("packages/*/package.json");

await bumpVersion(configPaths, version);
await pushChanges(configPaths, version);
await createRelease(version);
