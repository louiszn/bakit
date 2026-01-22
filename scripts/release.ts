import { readFile } from "node:fs/promises";

import { Octokit } from "@octokit/rest";
import { remark } from "remark";
import { parse } from "semver";
import { simpleGit } from "simple-git";
import { execa } from "execa";

import type { PackageJson } from "type-fest";

import type { Root, RootContent, Heading } from "mdast";

const GITHUB = {
	owner: "louiszn",
	repo: "bakit",
} as const;

const PACKAGES_ORDER = ["utils", "service", "rest", "gateway", "bakit"] as const;

const git = simpleGit();
const octokit = new Octokit({ auth: process.env["GITHUB_TOKEN"] });
const processor = remark();

const tags = new Set((await git.tags()).all);

for (const pkg of PACKAGES_ORDER) {
	await releasePackage(pkg);
}

async function releasePackage(name: string) {
	const pkg = await getPackageJSON(name);

	const pkgName = pkg.name!;
	const pkgVersion = pkg.version!;

	const semver = parse(pkgVersion, false, true);
	const isPrerelease = semver.prerelease.length > 0;
	const isLatest = !isPrerelease && pkgName === "bakit";

	const tagName = `${pkg.name}@${semver.version}`;

	if (tags.has(tagName)) {
		console.log(`Tag ${tagName} already exists, skipping...`);
		return;
	}

	tags.add(tagName);

	const markdown = await readFile(`packages/${name}/CHANGELOG.md`, "utf8").catch(() => null);

	if (!markdown) {
		throw new Error(`Missing CHANGELOG.md for bumped package ${pkgName}`);
	}

	const root = processor.parse(markdown) as Root;

	if (extractLatestVersion(root) !== pkgVersion) {
		throw new Error(
			`Version mismatch in ${pkgName} changelog: expected ${pkgVersion}, found ${extractLatestVersion(root)}`,
		);
	}

	console.log(`Releasing ${tagName}...`);

	const summary = processor.stringify(extractLatestSummary(root));

	await octokit.repos.createRelease({
		repo: GITHUB.repo,
		owner: GITHUB.owner,
		tag_name: tagName,
		name: tagName,
		body: summary,
		prerelease: isPrerelease,
		make_latest: isLatest ? "true" : "false",
	});

	await execa(
		"pnpm",
		[
			"publish",
			"--filter",
			pkgName,
			"--no-git-checks",
			"--access",
			"public",
			...(isPrerelease ? ["--tag", "next"] : []),
		],
		{
			stdio: "inherit",
		},
	);

	console.log(`Released ${tagName}`);
}

async function getPackageJSON(name: string): Promise<PackageJson> {
	const { default: pkg } = await import(`../packages/${name}/package.json`, {
		with: { type: "json" },
	});

	return pkg as PackageJson;
}

function extractLatestVersion(root: Root) {
	for (const node of root.children) {
		if (node.type !== "heading" || node.depth !== 2) {
			continue;
		}

		const textNode = node.children.find((child) => child.type === "text");

		if (textNode) {
			return textNode.value.trim();
		}
	}

	throw new Error("Latest version not found in changelog");
}

function extractLatestSummary(root: Root): Root {
	let collecting = false;
	const summary: RootContent[] = [];

	for (const node of root.children) {
		if (node.type === "heading" && node.depth === 1) {
			continue;
		}

		// Version boundary
		if (node.type === "heading" && node.depth <= 2) {
			if (collecting) {
				break;
			}

			collecting = true;
			continue;
		}

		if (collecting) {
			if ("depth" in node) {
				summary.push({
					...node,
					depth: (node.depth - 2) as Heading["depth"],
				});
			} else {
				summary.push(node);
			}
		}
	}

	if (!collecting || summary.length === 0) {
		throw new Error("Latest version summary not found in changelog");
	}

	return {
		type: "root",
		children: summary,
	};
}
