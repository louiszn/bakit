import { createServer, Server, Socket } from "node:net";
import { unlinkSync } from "node:fs";
import { BaseServerDriver, type BaseServerDriverEvents } from "../BaseDriver.js";
import { FrameCodec, type FrameCodecOptions } from "@/lib/FrameCodec.js";
import { getIPCPath, isServerRunning } from "@/utils/ipc.js";

import type { Serializable } from "@/types/message.js";

export interface IPCServerOptions {
	id: string;
	codec?: FrameCodecOptions;
}

export interface IPCServerEvents extends BaseServerDriverEvents {
	message: [socket: Socket, message: Serializable];
	clientConnect: [socket: Socket];
	clientDisconnect: [socket: Socket];
	clientError: [socket: Socket, error: Error];
}

interface Client {
	socket: Socket;
	codec: FrameCodec;
}

export class IPCServer extends BaseServerDriver<IPCServerOptions, IPCServerEvents> {
	private server?: Server;
	private clients = new Map<Socket, Client>();
	private codecOptions: FrameCodecOptions;

	private encoder: FrameCodec;

	public constructor(options: IPCServerOptions) {
		super(options);

		this.codecOptions = options.codec ?? {};
		this.encoder = new FrameCodec(this.codecOptions);
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
		// Each client needs its own decoder state (buffer management)
		const clientState: Client = {
			socket,
			codec: new FrameCodec(this.codecOptions),
		};

		this.clients.set(socket, clientState);
		this.emit("clientConnect", socket);

		socket.on("data", (chunk) => this.handleData(socket, clientState, chunk));
		socket.on("close", () => this.handleDisconnect(socket));
		socket.on("error", (err) => this.emit("clientError", socket, err));
	}

	private handleData(socket: Socket, client: Client, chunk: Buffer) {
		try {
			const packets = client.codec.push(chunk);

			for (const packet of packets) {
				const message = this.deserialize(packet);

				this.emit("message", socket, message);
			}
		} catch (err) {
			// Frame decode error (e.g., maxFrameSize exceeded)
			this.emit("clientError", socket, err as Error);
			socket.destroy();
		}
	}

	private handleDisconnect(socket: Socket) {
		const state = this.clients.get(socket);

		if (!state) {
			return;
		}

		this.clients.delete(socket);
		this.emit("clientDisconnect", socket);
	}

	/**
	 * Send message to a specific client
	 */
	public send(socket: Socket, message: Serializable): Promise<void> {
		const state = this.clients.get(socket);
		if (!state) {
			return Promise.reject(new Error("Client not connected"));
		}

		const payload = this.serialize(message);
		// Use the shared codec options for encoding (frame format should be consistent)
		const frame = this.encoder.encode(payload);

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

	/**
	 * Broadcast to all connected clients
	 * Returns count of successful sends (fire-and-forget, errors emitted via 'clientError')
	 */
	public broadcast(message: Serializable): number {
		const payload = this.serialize(message);
		const frame = this.encoder.encode(payload);

		let sent = 0;

		for (const [socket] of this.clients) {
			if (socket.destroyed) continue;

			socket.write(frame, (err) => {
				if (err) {
					this.emit("clientError", socket, err);
				}
			});

			sent++;
		}

		return sent;
	}

	/**
	 * Close server and disconnect all clients
	 */
	public close(): Promise<void> {
		return new Promise((resolve) => {
			// Destroy all client sockets first
			for (const [socket] of this.clients) {
				socket.destroy();
			}
			this.clients.clear();

			if (this.server) {
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
			} else {
				resolve();
			}
		});
	}

	public get clientCount(): number {
		return this.clients.size;
	}

	private serialize(obj: Serializable): Buffer {
		return Buffer.from(JSON.stringify(obj));
	}

	private deserialize(buf: Buffer): Serializable {
		return JSON.parse(buf.toString());
	}
}

export function createIPCServer(options: IPCServerOptions) {
	return new IPCServer(options);
}
