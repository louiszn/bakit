import EventEmitter from "node:events";
import { fork, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getServiceName } from "./Service.js";
import { sleep } from "@bakit/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServiceProcessEvents {
	stdout: [chunk: Buffer];
	stderr: [chunk: Buffer];
	spawn: [];
	error: [err: Error];
	exit: [code: number | null, signal: NodeJS.Signals | null];
}

export enum ServiceState {
	Idle,
	Starting,
	Running,
	Restarting,
	Stopping,
	Stopped,
}

export class ServiceProcess extends EventEmitter<ServiceProcessEvents> {
	private child?: ChildProcess;
	private spawnTimestamp = -1;

	private _state = ServiceState.Idle;

	public constructor(public readonly path: string) {
		super();
	}

	public get name() {
		return getServiceName(this.path);
	}

	public get state() {
		return this._state;
	}

	public get ready() {
		return this.state === ServiceState.Running;
	}

	public get uptime() {
		if (this.spawnTimestamp === -1) {
			return -1;
		}

		return Date.now() - this.spawnTimestamp;
	}

	public start() {
		if (this.state === ServiceState.Running) {
			return;
		}

		this.init();
	}

	public async stop() {
		if (this.state === ServiceState.Stopped || this.state === ServiceState.Stopping) {
			return;
		}

		this._state = ServiceState.Stopping;

		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				if (!this.child?.killed) {
					this.child?.kill("SIGKILL");
				}
			}, 5000);

			this.once("exit", () => {
				clearTimeout(timeout);
				resolve();
			});

			this.child?.kill("SIGINT");
		});

		this._state = ServiceState.Stopped;
		this.cleanup();
	}

	public async restart() {
		if (this.state === ServiceState.Restarting) {
			return;
		}

		await this.stop();
		await sleep(1000);

		this.start();
	}

	private init() {
		if (this.child && this.child.connected) {
			return;
		}

		this._state = ServiceState.Starting;

		const file = join(__dirname, "service.js");

		this.child = fork(file, [], {
			env: {
				BAKIT_SERVICE_NAME: this.name,
				BAKIT_SERVICE_PATH: this.path,
				FORCE_COLOR: "1",
			},
			stdio: ["inherit", "pipe", "pipe", "ipc"],
		});

		this.child.on("exit", (code, signal) => this.onChildExit(code, signal));
		this.child.on("error", (err) => this.emit("error", err));
		this.child.on("spawn", () => this.onChildSpawn());

		this.child.stdout?.on("data", (chunk) => this.emit("stdout", chunk));
		this.child.stderr?.on("data", (chunk) => this.emit("stderr", chunk));
	}

	private cleanup() {
		if (this.child) {
			if (!this.child.killed) {
				this.child.kill();
			}

			this.child.removeAllListeners();
			this.child = undefined;
		}

		this.spawnTimestamp = -1;
	}

	private onChildSpawn() {
		this._state = ServiceState.Running;
		this.spawnTimestamp = Date.now();
		this.emit("spawn");
	}

	private onChildExit(code: number | null, signal: NodeJS.Signals | null) {
		const oldState = this._state;

		this._state = ServiceState.Stopped;
		this.cleanup();

		this.emit("exit", code, signal);

		const shouldRestart = oldState !== ServiceState.Stopping && oldState !== ServiceState.Restarting && code !== 0;

		if (shouldRestart) {
			this.restart();
		}
	}
}
