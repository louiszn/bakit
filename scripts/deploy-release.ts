import { simpleGit } from "simple-git";
import { Octokit } from "@octokit/rest";
import { createAppAuth, type InstallationAccessTokenAuthentication } from "@octokit/auth-app";
import { readFile, writeFile } from "node:fs/promises";

import glob from "tiny-glob";
import minimist from "minimist";
import semver from "semver";

const GITHUB = {
	owner: "louiszn",
	repo: "bakit",
} as const;

const { BAKIT_APP_SLUG, BAKIT_APP_ID, BAKIT_APP_INSTALLATION_ID, BAKIT_APP_PRIVATE } = process.env;

const args = minimist<{ version?: string }>(process.argv.slice(2));

if (!args.version || !semver.valid(args.version)) {
	throw new Error("Invalid version");
}

const parsed = semver.parse(args.version)!;
const version = `v${parsed.version}`;
const isPrerelease = parsed.prerelease.length > 0;

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

const paths = await glob("packages/**/package.json");

async function ensureCleanRepo() {
	const git = simpleGit();
	if (!(await git.status()).isClean()) {
		throw new Error("Working tree is not clean");
	}
}

async function bumpVersions() {
	await Promise.all(
		paths.map(async (path) => {
			const content = await readFile(path, "utf8");
			const updated = content.replace(/"version"\s*:\s*"[^"]+"/, `"version": "${version.slice(1)}"`);
			await writeFile(path, updated);
		}),
	);
}

async function commitTagAndPush() {
	const git = simpleGit();

	await git.addConfig("user.name", "Bakit");
	await git.addConfig("user.email", `${BAKIT_APP_ID}+${BAKIT_APP_SLUG}@users.noreply.github.com`);

	await git.add(paths);
	await git.commit(`chore(release): ${version}`, undefined, {
		"--author": `Bakit Bot <${BAKIT_APP_ID}+${BAKIT_APP_SLUG}[bot]@users.noreply.github.com>`,
	});
	await git.addTag(version);

	await git.raw([
		"push",
		`https://x-access-token:${installationAuth.token}@github.com/${GITHUB.owner}/${GITHUB.repo}.git`,
		"--follow-tags",
	]);
}

async function createRelease() {
	await octokit.repos.createRelease({
		owner: GITHUB.owner,
		repo: GITHUB.repo,
		tag_name: version,
		name: version,
		prerelease: isPrerelease,
		generate_release_notes: true,
	});
}

await ensureCleanRepo();
await bumpVersions();
await commitTagAndPush();
await createRelease();
