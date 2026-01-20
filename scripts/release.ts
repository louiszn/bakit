import { readFile } from "node:fs/promises";

import { Octokit } from "@octokit/rest";
import { remark } from "remark";
import { parse } from "semver";
import { simpleGit } from "simple-git";
import { execa } from "execa";
import glob from "tiny-glob";

import type { Root, RootContent, Heading } from "mdast";

const GITHUB = {
	owner: "louiszn",
	repo: "bakit",
} as const;

const changelogs = await glob("packages/*/CHANGELOG.md");

const git = simpleGit();
const octokit = new Octokit({ auth: process.env["GITHUB_TOKEN"] });
const processor = remark();

await Promise.all(changelogs.map(releasePackage));

async function releasePackage(path: string) {
	const markdown = await readFile(path, "utf8");
	const root = processor.parse(markdown) as Root;

	const pkgName = extractPackageName(root);
	const pkgVersion = extractLatestVersion(root);
	const pkgSummary = extractLatestSummary(root);

	const semver = parse(pkgVersion, false, true);
	const isPrerelease = semver.prerelease.length > 0;

	const summary = processor.stringify(pkgSummary);

	const tags = await git.tags();
	const tagName = `${pkgName}@${semver.version}`;

	if (tags.all.includes(tagName)) {
		console.log(`Tag ${tagName} already exists, skipping...`);
		return;
	}

	const isLatest = !isPrerelease && pkgName === "bakit";

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

function extractPackageName(root: Root) {
	for (const node of root.children) {
		if (node.type !== "heading" || node.depth !== 1) {
			continue;
		}

		const textNode = node.children.find((child) => child.type === "text");

		if (textNode) {
			return textNode.value.trim();
		}
	}

	throw new Error("Package name not found in changelog");
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
