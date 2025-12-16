import { fork, type ChildProcess } from "node:child_process";
import path, { resolve } from "node:path";

import chokidar from "chokidar";
import { RPC } from "bakit";

interface DevManagerOptions {
	rootDir: string;
	entry: string;
	hotDirs: string[];
}

export class DevProcessManager {
	private rpc: RPC | null = null;
	private restartTimer: NodeJS.Timeout | null = null;

	constructor(private options: DevManagerOptions) {}

	public start() {
		console.log("Starting bakit in dev mode...");

		this.startChild();
		this.startWatcher();
	}

	private startChild() {
		if (this.rpc) {
			return;
		}

		const entry = path.resolve(this.options.entry);

		const child = fork(entry, {
			execArgv: ["--import", "bakit/register"],
			stdio: "inherit",
			env: {
				...process.env,
				NODE_ENV: "development",
			},
		});

		this.rpc = new RPC(child);
		this.rpc.on("restart", (fileUpdated) => this.scheduleRestart(fileUpdated));
	}

	private restartChild() {
		if (!this.rpc) {
			return this.startChild();
		}

		const child = this.rpc.transport as ChildProcess;

		child.once("exit", () => {
			this.rpc = null;
			this.startChild();
		});

		child.kill("SIGTERM");
	}

	private startWatcher() {
		const { rootDir } = this.options;

		const watcher = chokidar.watch(rootDir, {
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 200,
				pollInterval: 50,
			},
		});

		watcher.on("change", (path) => this.onFileUpdate("fileChange", path));
		watcher.on("unlink", (path) => this.onFileUpdate("fileRemove", path));
	}

	private onFileUpdate(type: string, path: string) {
		try {
			// Let child process handle this with its custom loader
			// Since it has a dependencies graph checker, it can handle it dynamically
			this.rpc?.send(type, resolve(path));
		} catch {
			// Restart process in case the process exited
			this.scheduleRestart(true);
		}
	}

	private scheduleRestart(fileUpdated = false) {
		if (this.restartTimer) clearTimeout(this.restartTimer);

		this.restartTimer = setTimeout(() => {
			if (fileUpdated) {
				console.log("File changes detected, restarting...");
			}

			this.restartChild();
			this.restartTimer = null;
		}, 150);
	}
}
