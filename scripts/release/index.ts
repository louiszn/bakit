import { bumpVersions } from "./changeset.js";
import { getContext } from "./context.js";

const REPO = {
	owner: "louiszn",
	repo: "bakit",
};

console.log("⌛ Initializing context...");

const { git, octokit, auth } = await getContext({
	appId: process.env["GITHUB_APP_ID"]!,
	privateKey: process.env["GITHUB_PRIVATE_KEY"]!,
	installationId: Number(process.env["GITHUB_INSTALLATION_ID"]),
});

console.log("⌛ Setting up git...");

await Promise.all([
	git.addConfig("user.name", auth.name),
	git.addConfig("user.email", auth.email),
	git.remote(["set-url", "origin", `https://x-access-token:${auth.token}@github.com/louiszn/bakit.git`]),
]);

console.log("⌛ Fetching lastest tags...");

await git.fetch(["origin", "--prune"]);
await git.fetch(["--tags", "--force"]);

const tags = new Set((await git.tags()).all);

console.log("⌛ Bumping versions...");

const bumps = await bumpVersions(git);
const newBumps = bumps.filter((b) => !tags.has(b.tag));

if (newBumps.length === 0) {
	console.log("✅ All tags already exist, nothing to do.");
	process.exit(0);
}

console.log("⌛ Committing changes...");

await git.add(["packages/**/package.json", "packages/**/CHANGELOG.md"]);
await git.commit("chore(pkg): bump version");

for (const bump of newBumps) {
	await git.addAnnotatedTag(bump.tag, `Release ${bump.tag}`);
}

// Some runners don't know upstream branch.
const branch = (await git.revparse(["--abbrev-ref", "HEAD"])).trim();

await git.push("origin", branch);
await git.pushTags("origin");

console.log("⌛ Creating releases...");

for (const [index, bump] of newBumps.entries()) {
	try {
		await octokit.rest.repos.createRelease({
			owner: REPO.owner,
			repo: REPO.repo,
			tag_name: bump.tag,
			name: bump.tag,
			body: bump.summary,
			prerelease: bump.isPrerelease,
			make_latest: bump.isLatest ? "true" : "false",
		});

		console.log(`✅ [${index + 1}/${newBumps.length}] Created release ${bump.tag}`);
	} catch (err) {
		if (err instanceof Error && "status" in err && err.status === 422) {
			console.log(`⚠️ Release ${bump.tag} already exists, skipping`);
			continue;
		}

		throw err;
	}
}

console.log("✅ Release completed!");
