import { execa } from "execa";
import { remark } from "remark";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseSemver } from "semver";

import type { SimpleGit } from "simple-git";
import type { PackageJson } from "type-fest";
import type { Heading, Root, RootContent } from "mdast";

const processor = remark();

export async function bumpVersions(git: SimpleGit) {
	const { exitCode } = await execa("pnpm", ["-w", "changeset", "version"]);

	if (exitCode && exitCode !== 0) {
		throw new Error("Failed to bump versions");
	}

	const status = await git.status();
	const changelogs = status.modified.filter((f) => f.endsWith("CHANGELOG.md"));

	const bumps = [];

	for (const changelog of changelogs) {
		const name = getPackageNameFromChangelog(changelog);

		const pkg = await getPackageJSON(name);
		const markdown = await getPackageChangelog(name);

		const pkgName = pkg.name!;
		const pkgVersion = pkg.version!;

		const semver = parseSemver(pkgVersion, false, true);

		const root = processor.parse(markdown) as Root;

		const lastestVersion = extractLatestVersion(root);
		if (lastestVersion !== pkgVersion) {
			throw new Error(`Version mismatch in ${pkgName} changelog: expected ${pkgVersion}, found ${lastestVersion}`);
		}

		const lastestSummary = processor.stringify(extractLatestSummary(root));

		bumps.push({
			name: pkgName,
			version: pkgVersion,
			tag: `${pkgName}@${pkgVersion}`,
			summary: lastestSummary,
			isPrerelease: semver.prerelease.length > 0,
			isLatest: semver.prerelease.length === 0 && pkgName === "bakit",
		});
	}

	return bumps;
}

function getPackageNameFromChangelog(path: string) {
	const match = path.match(/^packages\/([^/]+)\//);

	if (!match || match.length < 2) {
		throw new Error(`Invalid changelog path: ${path}`);
	}

	return match[1]!;
}

async function getPackageJSON(name: string): Promise<PackageJson> {
	const path = resolve(process.cwd(), "packages", name, "package.json");

	const { default: pkg } = await import(pathToFileURL(path).toString(), {
		with: { type: "json" },
	});

	return pkg as PackageJson;
}

function getPackageChangelog(name: string): Promise<string> {
	const path = resolve(process.cwd(), "packages", name, "CHANGELOG.md");
	return readFile(path, "utf8");
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
