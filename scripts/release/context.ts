import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
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
		Octokit,
	});

	const octokit = await app.getInstallationOctokit(options.installationId);

	const { token } = (await octokit.auth()) as { token: string };
	const { data: info } = await octokit.apps.getAuthenticated();

	if (!info) {
		throw new Error("Failed to get authenticated app");
	}

	const name = `${info.slug}[bot]`;
	const email = `${info.slug}[bot]@users.noreply.github.com`;

	const git = simpleGit();

	return {
		octokit,
		app,
		git,
		auth: { token, name, email },
	};
}
