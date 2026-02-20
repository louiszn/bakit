import { App, Octokit } from "octokit";
import { simpleGit, type SimpleGit } from "simple-git";

export interface ContextOptions {
	appId: string;
	privateKey: string;
	installationId: number;
}

export interface Context {
	app: App;
	octokit: Octokit;
	git: SimpleGit;
	auth: ContextAuth;
}

export interface ContextAuth {
	token: string;
	name: string;
	email: string;
}

export async function getContext(options: ContextOptions): Promise<Context> {
	const app = new App({
		appId: options.appId,
		privateKey: options.privateKey,
	});

	const octokit = await app.getInstallationOctokit(options.installationId);

	const { data: info } = await octokit.rest.apps.getAuthenticated();

	if (!info) {
		throw new Error("Failed to get authenticated app");
	}

	const name = `${info.slug}[bot]`;
	const email = `${info.slug}[bot]@users.noreply.github.com`;

	const { token } = (await octokit.auth({
		type: "installation",
		installationId: options.installationId,
	})) as { token: string };

	const git = simpleGit();

	return {
		octokit,
		app,
		git,
		auth: { token, name, email },
	};
}
