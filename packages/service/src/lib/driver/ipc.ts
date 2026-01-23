import { Socket, createServer, createConnection } from "node:net";
import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";

import { pack, unpack } from "msgpackr";

import PQueue from "p-queue";
import { attachEventBus, type EventBus } from "@bakit/utils";

import type { ValueOf } from "type-fest";
import type { Serializable, BaseClientDriver, BaseClientDriverEvents, BaseServerDriverEvents } from "@/types/driver.js";

const UNIX_SOCKET_DIR = "/tmp";
const WINDOWS_PIPE_PREFIX = "\\\\.\\pipe\\";

export const SocketState = {
	Idle: 0,
	Connecting: 1,
	Connected: 2,
	Disconnected: 3,
	Reconnecting: 4,
	Destroyed: 5,
} as const;
export type SocketState = ValueOf<typeof SocketState>;

export const IPCServerState = {
	Idle: 0,
	Listening: 1,
	Closed: 2,
} as const;
export type IPCServerState = ValueOf<typeof IPCServerState>;

export interface IPCServerEvents extends BaseServerDriverEvents {
	message: [socket: Socket, message: Serializable];
	clientConnect: [socket: Socket];
	clientDisconnect: [socket: Socket];
	clientError: [socket: Socket, error: Error];
	drain: [socket: Socket];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IPCClientEvents extends BaseClientDriverEvents {}

export interface IPCServer extends EventBus<IPCServerEvents> {
	listen(): void;
	close(): void;
	broadcast(message: Serializable): void;
	send(socket: Socket, message: Serializable): void;

	readonly state: IPCServerState;
}

export interface IPCSocketConnection extends EventBus<IPCClientEvents>, IPCSocketMessageHandler {
	connect: () => void;
	disconnect: () => void;
	destroy: () => void;
	reconnect: () => void;
	write: (chunk: Buffer) => void;
	readonly state: SocketState;
}

export interface IPCSocketMessageHandler extends BaseClientDriver {
	handleData: (chunk: Buffer) => void;
}

export interface IPCServerOptions {
	id: string;
	platform?: NodeJS.Platform;
}

export interface IPCClientOptions {
	id: string;
	platform?: NodeJS.Platform;
	connection?: IPCSocketConnectionOptions;
}

export interface IPCSocketConnectionOptions {
	autoReconnect?: boolean;
	maxReconnectAttempts?: number;
	reconnectDelay?: number;
	requestConcurrency?: number;
}

export interface IPCSocketMessageHandlerOptions {
	onWrite(chunk: Buffer): void;
	onMessage(message: Serializable): void;
}

export const DEFAULT_IPC_SOCKET_CONNECTION_OPTIONS = {
	autoReconnect: true,
	maxReconnectAttempts: 10,
	reconnectDelay: 5_000,
	requestConcurrency: 10,
} as const satisfies IPCSocketConnectionOptions;

export function getIPCPath(id: string, platform = process.platform) {
	// Using a switch so we can add more weird OS adventures later.
	// Seriously, if you’re on some alien platform, good luck finding this code.
	switch (platform) {
		case "win32":
			// Windows pipes: where plumbers earn their paycheck.
			return `${WINDOWS_PIPE_PREFIX}${id}`;
		default:
			// Unix: just a cozy little socket file in /tmp
			return join(UNIX_SOCKET_DIR, `${id}.sock`);
	}
}

export function createIPCClient(options: IPCClientOptions): IPCSocketConnection {
	const ipcPath = getIPCPath(options.id, options.platform);
	return createIPCSocketConnection(ipcPath, options.connection);
}

export function createIPCServer(options: IPCServerOptions): IPCServer {
	const ipcPath = getIPCPath(options.id, options.platform);
	const clients = new Set<Socket>();

	let state: IPCServerState = IPCServerState.Idle;

	const base = {
		listen,
		close,
		broadcast,
		send,

		get state() {
			return state;
		},
	};

	const self: IPCServer = attachEventBus<IPCServerEvents, typeof base>(base);

	const server = createServer((socket) => {
		clients.add(socket);

		const handler = createIPCSocketMessageHandler({
			onMessage: (msg) => self.emit("message", socket, msg),
			onWrite: (chunk) => writeSocket(socket, chunk),
		});

		socket.on("data", handler.handleData);
		socket.on("error", (err) => self.emit("clientError", socket, err));
		socket.on("close", () => {
			clients.delete(socket);
			self.emit("clientDisconnect", socket);
		});

		self.emit("clientConnect", socket);
	});

	server.on("listening", () => {
		state = IPCServerState.Listening;
		self.emit("listen");
	});

	server.on("close", () => {
		state = IPCServerState.Closed;
		self.emit("close");
	});

	function listen() {
		if (existsSync(ipcPath)) {
			rmSync(ipcPath);
		}

		server.listen(ipcPath);
	}

	function close() {
		server.close();
	}

	function writeSocket(socket: Socket, chunk: Buffer) {
		if (!socket.writable) {
			return; // socket is on vacation, skip sending
		}

		const ok = socket.write(chunk); // attempt to send the goodies.

		if (!ok) {
			// If overwhelmed, wait for a breather.
			socket.once("drain", () => self.emit("drain", socket));
		}
	}

	/**
	 * Shout the message to the clients.
	 */
	function broadcast(message: Serializable) {
		const payload = pack(message);

		const header = Buffer.alloc(4);
		header.writeUInt32LE(payload.length); // always tell them how big the parcel is

		const packet = Buffer.concat([header, payload]);

		for (const socket of clients) {
			writeSocket(socket, packet);
		}
	}

	function send(socket: Socket, message: Serializable) {
		const payload = pack(message);

		const header = Buffer.alloc(4);
		header.writeUInt32LE(payload.length);

		const packet = Buffer.concat([header, payload]);

		writeSocket(socket, packet);
	}

	return self;
}

export function createIPCSocketConnection(
	socketPath: string,
	options: IPCSocketConnectionOptions = {},
): IPCSocketConnection {
	const resolvedOptions = { ...DEFAULT_IPC_SOCKET_CONNECTION_OPTIONS, ...options };

	const handler = createIPCSocketMessageHandler({
		onMessage: (message) => connection.emit("message", message),
		onWrite: write,
	});

	const queue = new PQueue({
		concurrency: resolvedOptions.requestConcurrency,
		autoStart: true,
	});
	queue.pause(); // Paused by default to prevent unhandled messages.

	let socket: Socket | undefined;
	let state: SocketState = SocketState.Idle;

	/**
	 * This variable is for connect() to check if the function is called more than once
	 * while trying to connect without messing with the state.
	 */
	let isConnecting = false;

	let shouldReconnect = resolvedOptions.autoReconnect;
	let reconnectAttempts = 0;
	let reconnectTimeout: NodeJS.Timeout | undefined;

	const connection: IPCSocketConnection = attachEventBus({
		...handler,
		connect,
		disconnect,
		destroy,
		reconnect,
		write,

		get state() {
			return state;
		},
	});

	/**
	 * Connect to the IPC server.
	 */
	function connect() {
		if (state === SocketState.Destroyed) {
			connection.emit("error", new Error("Cannot start a new socket after destroyed."));
			return;
		}

		if (state === SocketState.Connected || state === SocketState.Connecting) {
			connection.emit("error", new Error("The current socket is still running, use reconnect() instead."));
			return;
		}

		if (isConnecting) {
			connection.emit("error", new Error("connect() shouldn't be called more than once."));
			return;
		}

		// Keeps Reconnecting if possible, otherwise use Connecting state.
		if (state !== SocketState.Reconnecting) {
			state = SocketState.Connecting;
		}

		isConnecting = true;

		socket = createConnection(socketPath);
		initSocket();
	}

	function initSocket() {
		if (!socket) {
			return;
		}

		socket.on("connect", handleConnect);
		socket.on("data", handler.handleData);
		socket.on("error", handleError);
		socket.on("close", handleClose);
	}

	function handleConnect() {
		state = SocketState.Connected;

		isConnecting = false;
		reconnectAttempts = 0;
		shouldReconnect = resolvedOptions.autoReconnect;

		queue.start();

		connection.emit("connect");
	}

	function handleError(error: Error & { code: string | number }): void {
		if (error.code === "ECONNREFUSED" || error.code === "ENOENT") {
			return;
		}

		connection.emit("error", error);
	}

	function handleClose() {
		state = SocketState.Disconnected;
		queue.pause(); // pause the message queue, socket is taking a nap
		isConnecting = false;
		connection.emit("disconnect");
		scheduleReconnect(); // hope it comes back...
	}

	function scheduleReconnect() {
		if (!shouldReconnect) {
			return;
		}

		if (resolvedOptions.maxReconnectAttempts > 0 && reconnectAttempts >= resolvedOptions.maxReconnectAttempts) {
			connection.emit("error", new Error(`Max reconnect attempts (${resolvedOptions.maxReconnectAttempts}) exceeded`));
			state = SocketState.Disconnected;
		}

		// Prevent other timer to process reconnecting twice.
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = undefined;
		}

		reconnectTimeout = setTimeout(() => {
			reconnectTimeout = undefined;
			reconnect();
		}, resolvedOptions.reconnectDelay);
	}

	/**
	 * Forces a reconnection attempt.
	 * This bypasses `autoReconnect` and reconnect limits.
	 */
	function reconnect() {
		if (state === SocketState.Destroyed || state === SocketState.Reconnecting) {
			return;
		}

		reconnectAttempts++;

		state = SocketState.Reconnecting;

		cleanupSocket();
		connect();
	}

	/**
	 * Manually disconnect the socket and prevent auto reconnecting.
	 */
	function disconnect() {
		state = SocketState.Disconnected;
		shouldReconnect = false;
		cleanupSocket();
	}

	/**
	 * Destroy the socket and make it unusable.
	 */
	function destroy() {
		state = SocketState.Destroyed;
		shouldReconnect = false;
		queue.clear();

		connection.removeAllListeners();
		cleanupSocket();
	}

	/**
	 * Clean up timer and connection. This is needed to prepare for making a new connection like reconnect().
	 */
	function cleanupSocket() {
		queue.pause();

		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = undefined;
		}

		if (socket) {
			// Removing all listeners also prevents 'close' event being fired twice.
			socket.removeAllListeners();

			if (!socket.destroyed) {
				socket.destroy();
			}

			socket = undefined;
		}
	}

	function write(chunk: Buffer) {
		queue.add(() => {
			return new Promise<void>((resolve, reject) => {
				if (!socket || !socket.writable) {
					return resolve();
				}

				// Due to async issues, we have to check if it is safe to resolve or reject the promise.
				let done = false;

				const safeResolve = () => {
					if (!done) {
						done = true;
						resolve();
					}
				};
				const safeReject = (err: Error) => {
					if (!done) {
						done = true;
						reject(err);
					}
				};

				const ok = socket.write(chunk, (err) => {
					if (err) {
						safeReject(err);
					} else if (ok) {
						safeResolve();
					}
				});

				if (!ok) {
					socket.once("drain", safeResolve);
				}
			});
		});
	}

	return connection;
}

export function createIPCSocketMessageHandler(options: IPCSocketMessageHandlerOptions) {
	let buffer = Buffer.alloc(0);

	function handleData(chunk: Buffer) {
		buffer = Buffer.concat([buffer, chunk]);

		while (true) {
			if (buffer.length < 4) {
				break;
			}

			const messageLength = buffer.readUInt32LE(0);

			if (buffer.length < 4 + messageLength) {
				break;
			}

			const payload = buffer.subarray(4, 4 + messageLength);

			try {
				const message = unpack(payload);
				options.onMessage(message);
			} catch (error) {
				console.error("Failed to unpack message:", error);
			}

			buffer = buffer.subarray(4 + messageLength);
		}
	}

	function send(message: Serializable) {
		const payload = pack(message);

		const header = Buffer.alloc(4);
		header.writeUInt32LE(payload.length);

		const packet = Buffer.concat([header, payload]);
		options.onWrite(packet);
	}

	return {
		handleData,
		send,
	};
}
