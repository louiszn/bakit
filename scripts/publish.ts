import { homedir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";

const OWNER = "louiszn";
const REPO = "bakit";

const DEPENDENCY_FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

interface PackageJson {
	name: string;
	version: string;

	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}

	return value;
}

async function configureGit(): Promise<void> {
	console.log("[git] Configuring Git");

	await $`git config user.name "Bakit CI"`;
	await $`git config user.email "git@louiszn.fyi"`;

	await $`git config --unset-all http.sslCAInfo`
		.nothrow()
		.quiet();
}

async function configureRemote(): Promise<void> {
	const token = requireEnv("CODEBERG_TOKEN");
	const url = `https://${token}@codeberg.org/${OWNER}/${REPO}.git`;
	await $`git remote set-url origin ${url}`;
}

async function configureNpm(): Promise<void> {
	const token = requireEnv("NPM_TOKEN");
	const npmrc = join(homedir(), ".npmrc");

	console.log("[npm] Configuring authentication");

	await Bun.write(npmrc, `//registry.npmjs.org/:_authToken=${token}\n`);

	await $`chmod 600 ${npmrc}`;
}

function resolveWorkspaceRange(range: string, version: string): string {
	const value = range.slice("workspace:".length);

	switch (value) {
		case "*":
			return version;

		case "^":
			return `^${version}`;

		case "~":
			return `~${version}`;

		default:
			return value;
	}
}

async function preparePackageManifests(): Promise<void> {
	console.log("[publish] Resolving workspace dependencies");

	const glob = new Bun.Glob("packages/*/package.json");

	const packageFiles = Array.from(glob.scanSync("."));

	const workspacePackages = new Map<string, string>();

	for (const file of packageFiles) {
		const pkg = (await Bun.file(file).json()) as PackageJson;

		workspacePackages.set(pkg.name, pkg.version);
	}

	for (const file of packageFiles) {
		const pkg = (await Bun.file(file).json()) as PackageJson;

		for (const field of DEPENDENCY_FIELDS) {
			const dependencies = pkg[field];

			if (!dependencies) {
				continue;
			}

			for (const [name, range] of Object.entries(dependencies)) {
				if (!range.startsWith("workspace:")) {
					continue;
				}

				const version = workspacePackages.get(name);

				if (!version) {
					throw new Error(`${pkg.name} references unknown workspace package: ${name}`);
				}

				const resolved = resolveWorkspaceRange(range, version);

				dependencies[name] = resolved;

				console.log(`[publish] ${pkg.name}: ${name} ${range} -> ${resolved}`);
			}
		}

		await Bun.write(file, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
}

async function main(): Promise<void> {
	requireEnv("NPM_TOKEN");
	requireEnv("CODEBERG_TOKEN");

	await configureGit();
	await configureNpm();

	console.log("[publish] Building packages");

	await $`bun run build`;

	await preparePackageManifests();

	console.log("[publish] Publishing packages");

	await $`bunx changeset publish`;

	await configureRemote();

	console.log("[git] Pushing tags");

	await $`git push origin --tags`;

	console.log("[release] Publish completed");
}

try {
	await main();
} catch (error) {
	console.error("[release] Publish failed");

	console.error(error instanceof Error ? (error.stack ?? error.message) : error);

	process.exitCode = 1;
}
