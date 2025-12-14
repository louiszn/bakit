import { fork, type ChildProcess } from "node:child_process";
import path, { resolve } from "node:path";

import chokidar from "chokidar";

import { getTopLevelDirectory } from "../../lib/utils/module.js";

interface DevManagerOptions {
	rootDir: string;
	entry: string;
	hotDirs: string[];
}

export class DevProcessManager {
	private child: ChildProcess | null = null;
	private restartTimer: NodeJS.Timeout | null = null;

	constructor(private options: DevManagerOptions) {}

	public start() {
		console.log("Starting bakit in dev mode...");

		this.startChild();
		this.startWatcher();
	}

	private startChild() {
		if (this.child) return;

		const entry = path.resolve(this.options.entry);

		this.child = fork(entry, {
			execArgv: ["--import", "bakit/register"],
			stdio: "inherit",
			env: {
				...process.env,
				NODE_ENV: "development",
			},
		});

		this.child.on("exit", () => {
			this.child = null;
		});
	}

	private restartChild() {
		if (!this.child) {
			return this.startChild();
		}

		const old = this.child;

		old.once("exit", () => {
			this.child = null;
			this.startChild();
		});

		old.kill("SIGTERM");
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

		watcher.on("change", (path) => {
			this.onFileChanged(path);
		});
	}

	private onFileChanged(path: string) {
		if (!this.child) {
			return;
		}

		const top = getTopLevelDirectory(path, this.options.rootDir);

		if (top && this.options.hotDirs.includes(top)) {
			// Let child process handle hot reloading
			if (this.child.connected) {
				this.child.send({ type: `hmr:${top}`, path: resolve(path) });
			}
			return;
		}

		this.scheduleRestart();
	}

	private scheduleRestart() {
		if (this.restartTimer) clearTimeout(this.restartTimer);

		this.restartTimer = setTimeout(() => {
			console.log("Detected changes, restarting...");
			this.restartChild();
			this.restartTimer = null;
		}, 150);
	}
}
