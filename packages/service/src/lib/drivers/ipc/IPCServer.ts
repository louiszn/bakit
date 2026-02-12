import { createServer, Server, Socket } from "node:net";
import { unlinkSync } from "node:fs";
import { Collection } from "@discordjs/collection";

import { BaseServerDriver, type BaseServerDriverEvents } from "../BaseDriver.js";
import { FrameCodec, type FrameCodecOptions } from "@/lib/FrameCodec.js";
import { getIPCPath, isServerRunning } from "@/lib/utils/ipc.js";

import { IPCConnection } from "./IPCConnection.js";

import type { Serializable } from "@/types/message.js";
import type { Awaitable } from "@bakit/utils";

export interface IPCServerOptions {
	id: string;
	codec?: FrameCodecOptions;
}

export type IPCServerEvents = BaseServerDriverEvents<IPCConnection>;

export class IPCServer extends BaseServerDriver<IPCServerOptions, IPCConnection, IPCServerEvents> {
	private server?: Server;
	private codecOptions: FrameCodecOptions;

	public connections = new Collection<Socket, IPCConnection>();
	public codec: FrameCodec;

	public constructor(options: IPCServerOptions) {
		super(options);

		this.codecOptions = options.codec ?? {};
		this.codec = new FrameCodec(this.codecOptions);
	}

	get path() {
		return getIPCPath(this.options.id);
	}

	public async listen(): Promise<void> {
		if (this.server) {
			throw new Error(`Server '${this.options.id}' is already listening`);
		}

		const { path } = this;

		if (await isServerRunning(path)) {
			throw new Error(`Server '${this.options.id}' is already running at ${path}`);
		}

		// Clean up stale socket file on Unix (common cause of EADDRINUSE)
		if (process.platform !== "win32") {
			try {
				unlinkSync(path);
			} catch {
				// File didn't exist, ignore
			}
		}

		return new Promise((resolve, reject) => {
			this.server = createServer((socket) => this.handleConnection(socket));

			this.server.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE") {
					reject(new Error(`Address already in use: ${path}. Is another server running?`));
				} else {
					reject(err);
				}
			});

			this.server.listen(path, () => {
				this.emit("listen");
				resolve();
			});
		});
	}

	private handleConnection(socket: Socket) {
		const connection = new IPCConnection(this, socket);

		this.connections.set(socket, connection);
		this.emit("connectionAdd", connection);

		connection.on("message", (message) => this.emit("message", connection, message));
		connection.on("error", (err) => this.emit("connectionError", connection, err));
		connection.on("close", () => {
			this.connections.delete(socket);
			this.emit("connectionRemove", connection);
		});
	}

	public send(connection: IPCConnection, message: Serializable): Awaitable<void> {
		return connection.send(message);
	}

	/**
	 * Send message to a specific client
	 */
	public sendSocket(socket: Socket, message: Serializable): Promise<void> {
		const payload = FrameCodec.serialize(message);
		const frame = this.codec.encode(payload);

		return this.sendSocketFrame(socket, frame);
	}

	/**
	 * Broadcast to all connected clients
	 * Returns count of successful sends (fire-and-forget, errors emitted via 'clientError')
	 */
	public async broadcast(message: Serializable): Promise<void> {
		const payload = FrameCodec.serialize(message);
		const frame = this.codec.encode(payload);

		await Promise.all(this.connections.map((_, socket) => this.sendSocketFrame(socket, frame)));
	}

	/**
	 * Close server and disconnect all clients
	 */
	public close(): Promise<void> {
		return new Promise((resolve) => {
			// Destroy all client sockets first
			for (const connection of this.connections.values()) {
				connection.destroy();
			}

			this.connections.clear();

			if (!this.server) {
				resolve();
				return;
			}

			this.server.close(() => {
				this.server = undefined;

				// Clean up socket file
				if (process.platform !== "win32") {
					try {
						unlinkSync(this.path);
					} catch {
						// Ignore cleanup errors
					}
				}

				this.emit("close");
				resolve();
			});
		});
	}

	private sendSocketFrame(socket: Socket, frame: Buffer): Promise<void> {
		return new Promise((resolve, reject) => {
			if (socket.destroyed) {
				reject(new Error("Socket destroyed"));
				return;
			}

			socket.write(frame, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}

export function createIPCServer(options: IPCServerOptions) {
	return new IPCServer(options);
}
